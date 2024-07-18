import pandas as pd
import random
import numpy as np

companies ={"APPL":[250,280,220], "GOOGL":[320,350,290],
            "TSLA":[230,250,210]}
df = pd.DataFrame()

#HDFC- starts -1600, high- 1850 , low-1200
#Reliance -  starts- 2000, high -2500, low-1400
#TATA Motors -  starts- 500, high - 700, low - 350
#ITC - starts-300, high -450, low -200
#HAL - starts -3000, high - 3500, low -2500
#Paytm - starts -650, high - 750, low -350
#Zomato - starts- 100, high-  120, low- 65
#CIPLA - starts -900, high - 700, low - 500
#BPCL - starts - 350, high - 400, low - 200

np.random.seed(69)

def generate_rand_vals(start,high,low, company_name):
    trend = np.random.randint(low=-30, high=30, size=150)
    print(type(trend))
    price = [start]
    for i in range(1, 150):
        p = price[i-1] + trend[i]
        if p > high:
            p = high - np.random.randint(low=1, high=10)
        elif p < low:
            p = low + np.random.randint(low=1, high=10)
        price.append(p)
    df[company_name] = price
    

for company in companies:
    generate_rand_vals(companies[company][0],companies[company][1],companies[company][2],company)
    # print(companies[company])
df = df.astype(int)
df.to_csv('PRICE_LIST_DEMO.csv', sep=',', index=False)