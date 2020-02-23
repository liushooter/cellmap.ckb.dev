import {
  AddressType,
  bech32Address,
  fullPayloadToAddress,
} from '@nervosnetwork/ckb-sdk-utils';
import { BLOCK_ASSEMBLER_CODE } from './constant';

export const getCellAddress = (cell, prefix, ETH_LOCK_TYPE_ID) => {
  const { lockArgs, lockType, lockCode } = cell;

  const type =
    lockType === 'type' ? AddressType.TypeCodeHash : AddressType.DataCodeHash;

  if (lockCode === ETH_LOCK_TYPE_ID && lockType === 'type') {
    return lockArgs;
  }

  if (lockCode === BLOCK_ASSEMBLER_CODE && lockType === 'type') {
    return bech32Address(lockArgs, {
      prefix,
      type: AddressType.HashIdx,
      codeHashOrCodeHashIndex: '0x00',
    });
  }

  return fullPayloadToAddress({
    arg: lockArgs,
    prefix,
    codeHash: lockCode,
    type,
  });
};

export const uniqArray = array => {
  const res = [array[0]];
  for (const item of array) {
    // 每次从原数组取一个

    let matched = false;
    for (const resItem of res) {
      // 将这个元素与res中每个元素对比
      if (item === resItem) {
        // 若匹配成功，打断第i次的内部循环
        matched = true;
        break;
      }
    }
    /* 注意这里逻辑，不能用else，否则将多将很多元素放入res */
    if (!matched) {
      // 若匹配不成功，将该元素放入res
      res.push(item);
    }
  }
  return res;
};

export const hexDataOccupiedBytes = hexString => {
  // Exclude 0x prefix, and every 2 hex digits are one byte
  return (hexString.length - 2) / 2;
};

export const scriptOccupiedBytes = script => {
  if (script !== undefined && script !== null) {
    return (
      1 +
      hexDataOccupiedBytes(script.codeHash) +
      hexDataOccupiedBytes(script.args)
      //   script.args.map(hexDataOccupiedBytes).reduce((x, y) => x + y, 0)
    );
  }
  return 0;
};

export const cellOccupiedBytes = cell => {
  return (
    8 +
    hexDataOccupiedBytes(cell.data) +
    scriptOccupiedBytes(cell.lock) +
    scriptOccupiedBytes(cell.type)
  );
};
