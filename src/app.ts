import * as data from '../config/config.json';
import Exchange from './lib/exchange';
import DoveWallet from './exchange/doveWallet';
import Taker from './lib/taker';

export default class App {
  private config: any = data;

  private exchange: Exchange;
  private taker: Taker;

  constructor() {
    this.exchange = new DoveWallet(this.config);
    this.taker = new Taker(this.config, this.exchange);
  }

  public async run(): Promise<void> {
    console.log('initializing..');
    if (await this.exchange.init()) {
      console.log('initialized..');
      this.exchange.start();
      this.taker.start();
    } else {
      throw Error('Failed to initialize exchange..');
    }
  }
}

const app = new App();
app.run();
