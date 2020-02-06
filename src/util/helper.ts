import { AddressType, bech32Address, fullPayloadToAddress, } from '@nervosnetwork/ckb-sdk-utils';
import { BLOCK_ASSEMBLER_CODE, ETH_LOCK_CODE } from './constant';



export const getCellAddress = (cell, prefix) => {
  let { lockArgs, lockType, lockCode } = cell;

  console.log('lockCode', lockCode, lockType)
  let type =
    lockType == 'type' ? AddressType.TypeCodeHash : AddressType.DataCodeHash;

  if (lockCode === ETH_LOCK_CODE && lockType == 'type') {
    return lockArgs;
  }

  if (lockCode === BLOCK_ASSEMBLER_CODE && lockType == 'type') {
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


export const uniqArray = function(array) {
  let res = [ array[0] ];
  for (let i = 1; i < array.length; i++) { // 每次从原数组取一个
      let matched = false;
      for (let j = 0; j < res.length; j++) { // 将这个元素与res中每个元素对比
          if (array[i] == res[j]) { // 若匹配成功，打断第i次的内部循环
              matched = true;
              break;
          }
      }
      /* 注意这里逻辑，不能用else，否则将多将很多元素放入res */
      if (!matched) { // 若匹配不成功，将该元素放入res
          res.push(array[i]);
      }
  }
  return res;
};