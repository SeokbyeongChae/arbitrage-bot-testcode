import Big from 'big.js';

export enum OrderTypes {
  sell = 0,
  buy = 1,
}

export enum RoutineTypes {
  sell = 0,
  buy = 1,
}

export interface MarketInfo {
  market: string;
  orderType: OrderTypes;
  bgOrderPrice?: Big;
  bgOrderAmount?: Big;
}

export default interface Routine {
  routineTypes: RoutineTypes;
  lastOrderMilliseconds?: Number;
  marketString?: string;
  markets: MarketInfo[];
}
