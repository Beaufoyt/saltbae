import { ATR } from 'technicalindicators';

export const getRsi = (closingPrices, rsiPeriod) => {
    const rsi = [];
    let first = true;
    let loss, gain, diff, avgGain, avgLoss;
    for (let i = rsiPeriod - 1; i >= 0; i--) {
        loss = gain = 0;
        if (first) {
            for (let j = i + rsiPeriod - 1; j >= i; j--) {
                diff = closingPrices[j + 1] - closingPrices[j];
                if (diff > 0) {
                    loss += Math.abs(diff);
                }
                else {
                    gain += Math.abs(diff);
                }


            }
            first = false;
            avgGain = gain / rsiPeriod;
            avgLoss = loss / rsiPeriod;

        }
        else {
            diff = closingPrices[i + 1] - closingPrices[i];

            if (diff > 0) {
                loss += Math.abs(diff);
            }
            else {
                gain += Math.abs(diff);
            }
            avgGain = ((avgGain * (rsiPeriod - 1)) + gain) / rsiPeriod;
            avgLoss = ((avgLoss * (rsiPeriod - 1)) + loss) / rsiPeriod;
        }
        if (avgLoss == 0) {
            rsi[i] = 100;
        }
        else {
            rsi[i] = 100 - (100 / (1 + (avgGain / avgLoss)));
        }
    }
    return rsi;
}

export const getAtr = (candleData) => {
    return ATR.calculate(candleData);
}
