declare module 'flutterwave-node-v3' {
  class Flutterwave {
    constructor(publicKey: string, secretKey: string);
    Transaction: {
      verify: (data: { id: string }) => Promise<any>;
    };
  }

  export = Flutterwave;
}
