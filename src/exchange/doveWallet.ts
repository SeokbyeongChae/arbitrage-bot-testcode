import Big from 'big.js';
import Exchange from '../lib/exchange';
import Routine, { OrderTypes, RoutineTypes } from '../lib/routine';
import _ from 'lodash';
import crypto from 'crypto';
const querystring = require('querystring');
const axios = require('axios');

Big.NE = -19;

export default class DoveWallet extends Exchange {
  /* currency */
  private currencyMap: Map<string, any> = new Map();
  private currencyIdToSymbol: Map<number, string> = new Map();

  /* market */
  private markets: string[] = [];
  private updateMarketPriceHandler: NodeJS.Timeout | undefined;

  private walletId: number;
  private orderMagic: number;

  constructor(config: any) {
    super(config);

    this.walletId = config.exchange.walletId;
    this.orderMagic = config.order.minimumMagic;
  }

  public async init(): Promise<boolean> {
    super.init();

    if (!(await this.initMarkets())) return false;
    if (!(await this.initCurrencies())) return false;

    this.initRoutines();
    return true;
  }

  private async initMarkets(): Promise<boolean> {
    let markets;
    try {
      const result: any = await axios.get(this.config.connection.restEndpoint + `/public/getmarkets`);
      if (!result.data.success) return false;

      markets = result.data.result;
    } catch (e) {
      return false;
    }

    for (const market of markets) {
      this.markets.push(`${market.MarketCurrency}/${market.BaseCurrency}`);
    }

    return true;
  }

  private async initCurrencies(): Promise<boolean> {
    let currencies;
    try {
      const result: any = await axios.get(this.config.connection.restEndpoint + `/public/getmarkets`);
      if (!result.data.success) return false;

      currencies = result.data.result;
    } catch (e) {
      return false;
    }

    for (const currencyInfo of currencies) {
      this.currencyMap.set(currencyInfo.Currency, currencyInfo);
      this.currencyIdToSymbol.set(currencyInfo.Id, currencyInfo.Currency);
    }

    return true;
  }

  public initRoutines() {
    const initSellRoutine = (routine: Routine, targetCurrency: string, previousCurrency: string): any => {
      for (const index in this.markets) {
        const market = this.markets[index];
        if (routine.markets.findIndex((x: any) => x.market === market) !== -1) {
          continue;
        }

        const splitedMarket = market.split('/');
        const reverseMarket = `${splitedMarket[1]}/${splitedMarket[0]}`;
        if (routine.markets.findIndex((x: any) => x.market === reverseMarket) !== -1) {
          continue;
        }

        if (splitedMarket[1] === previousCurrency) {
          const deepCopiedRoutine1 = _.cloneDeep(routine);
          deepCopiedRoutine1.markets.push({
            market: market,
            orderType: OrderTypes.buy,
          });

          const nextSellMarket = `${splitedMarket[0]}/${targetCurrency}`;
          const nextSellMarketIndex = this.markets.findIndex((x: string) => x === nextSellMarket);
          if (nextSellMarketIndex !== -1) {
            const deepCopiedRoutine2 = _.cloneDeep(deepCopiedRoutine1);
            deepCopiedRoutine2.markets.push({
              market: nextSellMarket,
              orderType: OrderTypes.sell,
            });

            this.addRoutine(deepCopiedRoutine2);
          }

          const nextBuyMarket = `${targetCurrency}/${splitedMarket[0]}`;
          const nextBuyMarketIndex = this.markets.findIndex((x: string) => x === nextBuyMarket);
          if (nextBuyMarketIndex !== -1) {
            const deepCopiedRoutine2 = _.cloneDeep(deepCopiedRoutine1);
            deepCopiedRoutine2.markets.push({
              market: nextBuyMarket,
              orderType: OrderTypes.buy,
            });

            this.addRoutine(deepCopiedRoutine2);
          }
        }

        if (splitedMarket[0] === previousCurrency) {
          const deepCopiedRoutine1 = _.cloneDeep(routine);
          deepCopiedRoutine1.markets.push({
            market: market,
            orderType: OrderTypes.sell,
          });

          const nextSellMarket = `${splitedMarket[1]}/${targetCurrency}`;
          const nextSellMarketIndex = this.markets.findIndex((x: string) => x === nextSellMarket);
          if (nextSellMarketIndex !== -1) {
            const deepCopiedRoutine2 = _.cloneDeep(deepCopiedRoutine1);
            deepCopiedRoutine2.markets.push({
              market: nextSellMarket,
              orderType: OrderTypes.sell,
            });

            this.addRoutine(deepCopiedRoutine2);
          }

          const nextBuyMarket = `${targetCurrency}/${splitedMarket[1]}`;
          const nextBuyMarketIndex = this.markets.findIndex((x: string) => x === nextBuyMarket);
          if (nextBuyMarketIndex !== -1) {
            const deepCopiedRoutine2 = _.cloneDeep(deepCopiedRoutine1);
            deepCopiedRoutine2.markets.push({
              market: nextBuyMarket,
              orderType: OrderTypes.buy,
            });

            this.addRoutine(deepCopiedRoutine2);
          }
        }
      }
    };

    const initBuyRoutine = (routine: Routine, targetCurrency: string, previousCurrency: string) => {
      for (const index in this.markets) {
        const market = this.markets[index];
        if (routine.markets.findIndex((x: any) => x.market === market) !== -1) {
          continue;
        }

        const splitedMarket = market.split('/');
        const reverseMarket = `${splitedMarket[1]}/${splitedMarket[0]}`;
        if (routine.markets.findIndex((x: any) => x.market === reverseMarket) !== -1) {
          continue;
        }

        if (splitedMarket[1] === previousCurrency) {
          const deepCopiedRoutine1 = _.cloneDeep(routine);
          deepCopiedRoutine1.markets.push({
            market: market,
            orderType: OrderTypes.sell,
          });

          const nextSellMarket = `${splitedMarket[0]}/${targetCurrency}`;
          const nextSellMarketIndex = this.markets.findIndex((x: string) => x === nextSellMarket);
          if (nextSellMarketIndex !== -1) {
            const deepCopiedRoutine2 = _.cloneDeep(deepCopiedRoutine1);
            deepCopiedRoutine2.markets.push({
              market: nextSellMarket,
              orderType: OrderTypes.buy,
            });

            this.addRoutine(deepCopiedRoutine2);
          }

          const nextBuyMarket = `${targetCurrency}/${splitedMarket[0]}`;
          const nextBuyMarketIndex = this.markets.findIndex((x: string) => x === nextBuyMarket);
          if (nextBuyMarketIndex !== -1) {
            const deepCopiedRoutine2 = _.cloneDeep(deepCopiedRoutine1);
            deepCopiedRoutine2.markets.push({
              market: nextBuyMarket,
              orderType: OrderTypes.sell,
            });

            this.addRoutine(deepCopiedRoutine2);
          }
        }

        if (splitedMarket[0] === previousCurrency) {
          const deepCopiedRoutine1 = _.cloneDeep(routine);
          deepCopiedRoutine1.markets.push({
            market: market,
            orderType: OrderTypes.buy,
          });

          const nextSellMarket = `${splitedMarket[1]}/${targetCurrency}`;
          const nextSellMarketIndex = this.markets.findIndex((x: string) => x === nextSellMarket);
          if (nextSellMarketIndex !== -1) {
            const deepCopiedRoutine2 = _.cloneDeep(deepCopiedRoutine1);
            deepCopiedRoutine2.markets.push({
              market: nextSellMarket,
              orderType: OrderTypes.buy,
            });

            this.addRoutine(deepCopiedRoutine2);
          }

          const nextBuyMarket = `${targetCurrency}/${splitedMarket[1]}`;
          const nextBuyMarketIndex = this.markets.findIndex((x: string) => x === nextBuyMarket);
          if (nextBuyMarketIndex !== -1) {
            const deepCopiedRoutine2 = _.cloneDeep(deepCopiedRoutine1);
            deepCopiedRoutine2.markets.push({
              market: nextBuyMarket,
              orderType: OrderTypes.sell,
            });

            this.addRoutine(deepCopiedRoutine2);
          }
        }
      }
    };

    for (const market of this.markets) {
      const splitedMarket = market.split('/');
      const sellRoutine: Routine = {
        markets: [
          {
            market: market,
            orderType: OrderTypes.sell,
          },
        ],
        routineTypes: RoutineTypes.sell,
      };
      initSellRoutine(sellRoutine, splitedMarket[0], splitedMarket[1]);

      const buyRoutine: Routine = {
        markets: [
          {
            market: market,
            orderType: OrderTypes.buy,
          },
        ],
        routineTypes: RoutineTypes.buy,
      };
      initBuyRoutine(buyRoutine, splitedMarket[0], splitedMarket[1]);
    }
  }

  public start(): void {
    this.updateMarketPriceInterval();
  }

  public stop(): void {
    super.stop();

    if (this.updateMarketPriceHandler) {
      clearInterval(this.updateMarketPriceHandler);
      this.updateMarketPriceHandler = undefined;
    }
  }

  private updateMarketPriceInterval(): void {
    const execution = () => {
      axios
        .get(this.config.connection.restEndpoint + `/public/getmarketsummaries`)
        .then((res: any) => {
          // console.time('updateMarket');
          for (const market of res.data.result) {
            const splitedMarketName = market.MarketName.split('-');
            this.updateMarketPrice(`${splitedMarketName[1]}/${splitedMarketName[0]}`, market.Ask, market.Bid);
          }
          // console.timeEnd('updateMarket');
        })
        .catch((err: any) => {
          console.dir(err);
        });
    };

    this.updateMarketPriceHandler = setInterval(execution, this.config.taker.updateMarketPriceInterval);
  }

  private objectSort(data: any) {
    const newObject = Object.create(null);
    for (const key of Object.keys(data).sort()) {
      newObject[key] = data[key];
    }
    return newObject;
  }

  public openOrder(currencySymbol1: string, currencySymbol2: string, buySide: boolean, bgPrice: Big, bgAmount: Big) {
    const paramObject = {
      apikey: this.config.connection.apiKey,
      market: `${currencySymbol1}-${currencySymbol2}`,
      quantity: bgAmount.toString(),
      rate: bgPrice.toString(),
      walletid: this.walletId,
      magic: this.orderMagic++,
    };

    if (this.orderMagic >= this.config.order.maximumMagic) {
      this.orderMagic = this.config.order.minimumMagic;
    }

    const url = `${this.config.connection.restEndpoint}/market/${buySide ? 'buylimit' : 'selllimit'}`;

    const query = querystring.stringify(this.objectSort(paramObject));
    const apisign = crypto.createHmac('sha512', this.apiSecret).update(`${url}?${query}`).digest('hex');
    const options = {
      method: 'GET',
      url: `${url}?${query}`,
      headers: {
        apisign: apisign,
      },
    };

    axios(options)
      .then((response: any) => {
        if (response.data.success) {
          this.closeOrder(response.data.result.uuid);
        } else {
          console.log('failed to open order: ', response.data.message);
        }
      })
      .catch((error: any) => {
        console.log('failed to open order: ', JSON.stringify(error));
      });
  }

  public closeOrder(id: number) {
    const paramObject = { apikey: this.apiKey, uuid: id, walletid: this.walletId };
    const url = `${this.config.connection.restEndpoint}/market/cancel`;

    const query = querystring.stringify(this.objectSort(paramObject));
    const apisign = crypto.createHmac('sha512', this.apiSecret).update(`${url}?${query}`).digest('hex');
    const options = {
      method: 'GET',
      url: `${url}?${query}`,
      headers: {
        apisign: apisign,
      },
    };

    axios(options)
      .then((response: any) => {
        if (!response.data.success) {
          // console.log('failed to close order: ', response.data.message);
        }
      })
      .catch((error: any) => {
        console.log('failed to close order: ', JSON.stringify(error));
      });
  }
}
