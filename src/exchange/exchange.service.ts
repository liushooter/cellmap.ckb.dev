import { Injectable, Inject } from '@nestjs/common';
import { NestSchedule, Interval } from 'nest-schedule';
import { EthTransfer } from './ethtransfer.entity';
import { ETHTRANSFER_REPOSITORY } from '../util/constant';
import { LoggerService } from 'nest-logger';
import { ConfigService } from 'src/config/config.service';
import {
  init,
  EtherscanApi,
  Response,
  ProxyResponse,
  Transaction,
  TokenTransaction,
} from 'etherscan-api';
import { huobipro } from 'ccxt';
import { RedisService } from 'nestjs-redis';
import * as web3Utils from 'web3-utils';
import { CkbService } from 'src/ckb/ckb.service';
import { CellService } from 'src/cell/cell.service';

@Injectable()
export class ExchangeService extends NestSchedule {
  private depositEthAddress: string;
  private etherscanApi: EtherscanApi;
  private huobiClient: huobipro;

  constructor(
    @Inject(ETHTRANSFER_REPOSITORY)
    private readonly ethTransferModel: typeof EthTransfer,
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
    private readonly ckbService: CkbService,
    private readonly cellService: CellService,
  ) {
    super();
    this.etherscanApi = init(
      this.config.get('ETHERSCAN_TOKEN'),
      this.config.get('ETH_CHAIN'),
    );
    this.depositEthAddress = this.config.get('ETH_DEPOSIT_ADDRESS');

    this.huobiClient = new huobipro();
    this.syncEthTransfers();
  }

  /**
   * fetch result from etherscan api response
   * @param response
   */
  getResultFromEtherscanApiResponse<T>(response: Response<T>): T {
    return response.result;
  }

  /**
   * fetch result from etherscan api proxy response
   * @param response
   */
  getResultFromEtherscanApiProxyResponse<T>(response: ProxyResponse<T>): T {
    return response.result;
  }

  @Interval(15 * 1000)
  async getAssetPrice() {
    const ckbTicker = await this.huobiClient.fetchTicker('CKB/USDT');
    await this.redisService.getClient().set('CKB_price', ckbTicker.ask);

    for (const token of this.config.tokenList) {
      if (token.symbol === 'USDT') {
        await this.redisService.getClient().set(`${token.symbol}_price`, 1);
      } else {
        const ticker = await this.huobiClient.fetchTicker(
          `${token.symbol}/USDT`,
        );
        await this.redisService
          .getClient()
          .set(`${token.symbol}_price`, ticker.bid);
      }
    }
  }

  /**
   * deliver CKB to user according to eth transfer's status
   */
  @Interval(30 * 1000)
  async checkDeliverCKB() {
    // check status of deliver transaction on CKB, update transfer status to finished
    const deliveredTransfers = await this.ethTransferModel.findAll({
      where: { status: 3 },
    });

    for (const deliveredTransfer of deliveredTransfers) {
      if (this.cellService.getTxByHash(deliveredTransfer.ckbTxHash) != null) {
        deliveredTransfer.status = 4;
        await deliveredTransfer.save();
      }
    }

    // concurrent problem here
    const unDevliveredTransfers = await this.ethTransferModel.findAll({
      where: { status: 2 },
    });

    // devliver CKB
    for (const unDevliveredTransfer of unDevliveredTransfers) {
      await this.deliverCKB(unDevliveredTransfer);
    }
  }

  /**
   * request recent txs from etherscanapi every 5 seconds, and process these txs.
   */
  @Interval(30 * 1000)
  async syncEthTransfers() {
    // get eth latest block number
    const latestBlockNumber = Number(
      this.getResultFromEtherscanApiProxyResponse(
        await this.etherscanApi.proxy.eth_blockNumber(),
      ),
    );
    const lastProcessedBlockNumber = Number(
      (await this.ethTransferModel.max('block', { where: { status: 2 } })) || 0,
    );
    this.logger.info(
      `startBlock=[${lastProcessedBlockNumber}], endBlock=[${latestBlockNumber}] `,
      ExchangeService.name,
    );

    await this.processRecentTxs(
      lastProcessedBlockNumber + 1,
      latestBlockNumber,
    );

    const erc20TokenList = this.config.tokenList.filter(
      v => v.symbol !== 'ETH',
    );
    for (const token of erc20TokenList) {
      await this.processRecentTokenTxs(
        token.symbol,
        token.address,
        lastProcessedBlockNumber,
        latestBlockNumber,
      );
    }
    this.logger.info(`syncEthTransfer job finished!`);
  }

  /**
   * get recent ethereum transactions, save tx to db
   * @param startBlock
   * @param endBlock
   */
  async processRecentTxs(startBlock: number, endBlock: number) {
    let txs = this.getResultFromEtherscanApiResponse(
      await this.etherscanApi.account.txlist(
        this.depositEthAddress,
        startBlock,
        endBlock,
      ),
    );

    txs = txs.filter(
      tx => tx.to.toLowerCase() === this.depositEthAddress.toLowerCase(),
    );

    this.logger.info(`ETH processRecentTxs txs size = ${txs.length}`);
    for (const tx of txs) {
      if (tx.txreceipt_status === '1') {
        await this.saveUserTransfer(tx, 'ETH');
      }
    }
  }

  /**
   * get recent ERC20 token transactions, save txs to db
   * @param tokenContractAddress
   * @param startBlock
   * @param endBlock
   */
  async processRecentTokenTxs(
    tokenName: string,
    tokenContractAddress: string,
    startBlock: number,
    endBlock: number,
  ) {
    // // get ERC20 token transactions
    let tokenTxs = this.getResultFromEtherscanApiResponse(
      await this.etherscanApi.account.tokentx(
        this.depositEthAddress,
        tokenContractAddress,
        startBlock,
        endBlock,
      ),
    );

    tokenTxs = tokenTxs.filter(
      tx => tx.to.toLowerCase() === this.depositEthAddress.toLowerCase(),
    );
    this.logger.info(
      `${tokenName} processRecentTokenTxs tokenTxs size = ${tokenTxs.length}`,
    );

    for (const tokenTx of tokenTxs) {
      await this.saveUserTransfer(tokenTx, tokenName);
    }
  }

  /**
   * extract transfer info from transaction, save it to db
   * @param tx transaction from etherscan api response
   */
  async saveUserTransfer(tx: Transaction | TokenTransaction, token: string) {
    const { blockNumber, hash, from, to, value, confirmations } = tx;

    let transfer = await this.ethTransferModel.findOne({
      where: { txhash: hash },
    });

    if (!transfer) {
      transfer = new EthTransfer();
      transfer.txhash = hash;
      transfer.block = Number(blockNumber);
      transfer.currency = token;
      transfer.from = from;
      transfer.to = to;
      transfer.amount = Number(value);
      transfer.confirmations = Number(confirmations);
      transfer.status = transfer.confirmations >= 15 ? 2 : 1;
    } else if (transfer.status < 2) {
      transfer.confirmations = Number(confirmations);
      transfer.status = transfer.confirmations >= 15 ? 2 : 1;
    } else {
      this.logger.info(
        `txhash[${hash}] from[${from}] existed in db, will do nothing!`,
      );
      return;
    }
    // set price related attributes
    if (transfer.status === 2) {
      const tokenPrice = Number(
        await this.redisService.getClient().get(`${token.toLowerCase()}_price`),
      );
      const ckbPrice = Number(
        await this.redisService.getClient().get('CKB_price'),
      );
      const ckbAmount = this.calculateExchangeAssets(
        18,
        transfer.amount,
        tokenPrice,
        ckbPrice,
      );
      this.logger.info(
        `tokenPrice=${tokenPrice}, ckbPrice=${ckbPrice}, tokenAmount=${transfer.amount}, ckbAmount=${ckbAmount}`,
        ExchangeService.name,
      );
      transfer.currencyPrice = tokenPrice;
      transfer.ckbPrice = ckbPrice;
      transfer.ckbAmount = ckbAmount;
    }

    await transfer.save();
  }

  /**
   * calculate the corresponding ckb amount for received token at current price from exchanges
   * @param tokenDecimal
   * @param amount
   * @param tokenPrice
   * @param ckbPrice
   */
  calculateExchangeAssets(
    tokenDecimal: number,
    amount: number,
    tokenPrice: number,
    ckbPrice: number,
  ): number {
    const tokenPriceBN = web3Utils.toBN(
      Math.floor(Number(tokenPrice) * 10 ** 8),
    );
    const ckbPriceBN = web3Utils.toBN(Math.floor(Number(ckbPrice) * 10 ** 8));
    const ckbDecimal = 8;
    const ckbAmount = Number(
      web3Utils
        .toBN(amount)
        .add(tokenPriceBN)
        .div(ckbPriceBN)
        .div(web3Utils.toBN(tokenDecimal - ckbDecimal))
        .toString(10),
    );

    return ckbAmount;
  }

  /**
   * send CKBytes to user
   * @param transfer
   */
  async deliverCKB(transfer: EthTransfer) {
    // build ckb transaction
    const ckb = this.ckbService.getCKB();
    const capacity = transfer.ckbAmount;

    if (capacity < 61 * 10 ** 8) {
      this.logger.info(
        `capacity ${capacity} is less than 61 CKBytes`,
        ExchangeService.name,
      );
      return;
    }

    ckb.config.secp256k1Dep = await this.cellService.loadSecp256k1Cell();

    const privateKey = this.config.CKB_PRIVATE_KEY;
    const publicKey = ckb.utils.privateKeyToPublicKey(privateKey);
    const publicKeyHash = `0x${ckb.utils.blake160(publicKey, 'hex')}`;
    const fromAddress = ckb.utils.pubkeyToAddress(publicKey);
    const toAddress = fromAddress;

    const senderLock: CKBComponents.Script = {
      hashType: 'type',
      codeHash:
        '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
      args: publicKeyHash,
    };
    const lockHash = ckb.utils.scriptToHash(senderLock);
    const redisLastIdKey = `unspent_lastId_${lockHash}`;
    const lastId = await this.redisService.getClient().get(redisLastIdKey);
    const unspentCells = await this.cellService.pickLiveCellForTransfer(
      lockHash,
      capacity.toString(),
      Number(lastId || 0),
    );

    await this.redisService
      .getClient()
      .set(redisLastIdKey, unspentCells[unspentCells.length - 1].id);

    const rawTransaction = await ckb.generateRawTransaction({
      fromAddress,
      toAddress,
      capacity: BigInt(capacity),
      fee: BigInt(100000),
      safeMode: true,
      cells: unspentCells,
      deps: ckb.config.secp256k1Dep,
    });

    rawTransaction.outputs[0].lock = {
      hashType: 'type',
      codeHash: this.config.ETH_LOCK_TYPE_ID,
      args: transfer.from,
    };
    rawTransaction.witnesses = rawTransaction.inputs.map(() => '0x');
    rawTransaction.witnesses[0] = {
      lock: '',
      inputType: '',
      outputType: '',
    };

    // sign transaction
    const signedTx = ckb.signTransaction(privateKey)(rawTransaction, null);
    // send to ckb node and get txHash
    console.log('signedTx', JSON.stringify(signedTx));
    const realTxHash = await ckb.rpc.sendTransaction(signedTx);
    // set txHash to database, update transfer status
    transfer.ckbTxHash = realTxHash;
    transfer.status = 3;
    await transfer.save();

    return true;
  }

  async getUserTransfers(ethAddress: string): Promise<any[]> {
    // check address format

    // fetch transfer from table order by id desc
    const transfers = await this.ethTransferModel.findAll({
      where: { from: ethAddress },
      order: [['id', 'desc']],
    });
    // return transfers;

    return transfers.map(item => {
      const decimal = this.config.tokenList.filter(
        t => t.symbol === item.currency,
      )[0].decimal;
      const {
        id,
        txhash,
        confirmations,
        currency,
        from,
        to,
        amount,
        ckbAmount,
        currencyPrice,
        ckbPrice,
        status,
        transferTime,
      } = item;

      return {
        id,
        txhash,
        confirmations,
        currency,
        decimal,
        from,
        to,
        amount,
        ckbAmount,
        currencyPrice,
        ckbPrice,
        status,
        transferTime,
      };
    });
  }

  async getConfig() {
    const tokenList = this.config.tokenList;
    const chain = this.config.get('ETH_CHAIN');

    return {
      chain,
      depositEthAddress: this.depositEthAddress,
      tokenList,
    };
  }

  async exchangeRate() {
    const tokenList = this.config.tokenList;

    const tokenRateList = [];
    for (const token of tokenList) {
      const { symbol } = token;
      const price = await this.redisService.getClient().get(`${symbol}_price`);
      tokenRateList.push({ symbol, price });
    }
    const ckbPrice = await this.redisService.getClient().get(`CKB_price`);
    tokenRateList.push({ symbol: 'CKB', price: ckbPrice });
    return tokenRateList;
  }
}
