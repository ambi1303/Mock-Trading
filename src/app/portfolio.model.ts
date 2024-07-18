// portfolio.model.ts
export interface Portfolio {
  avgPrices: any;
  cash: number;
  stocks: { [key: string]: number }; // Ensure this is an object
  transactions: any[];
}

  
  export interface Transaction {
   type:'buy'|'sell';
   symbol:string;
   quantity:number;
   price:number;
   avgPrices:number,
   timestamp:number;
  }
  