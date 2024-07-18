// portfolio.model.ts
export interface Portfolio {
  cash: number;
  stocks: { [key: string]: number }; // Ensure this is an object
  stock_purchases:{[key:string]:StockPurchase[]};
  transactions: Transaction[];
}
export interface StockPurchase{
  quantity:number;
  price:number;
}
  
  export interface Transaction {
   type:'buy'|'sell';
   symbol:string;
   quantity:number;
   price:number;
   timestamp:number;
  }
  