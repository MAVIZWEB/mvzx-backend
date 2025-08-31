declare module 'flutterwave-node-v3' {
  class Flutterwave {
    constructor(publicKey: string, secretKey: string);
    Payment: {
      initiate(data: any): Promise<any>;
    };
    Transaction: {
      verify(data: { id: string }): Promise<any>;
    };
  }
  
  export default Flutterwave;
}
