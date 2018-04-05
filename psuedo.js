var stochastic = ..;  //9,3,3
var macd = .. ; //12,26,9
var ATR = ..; //50
var order_limit = ATR * 3;
var order _stop = -(order_limit / 2);
var target_profit = account_balance * 0.05;
var order_size = target_profit / order_limit // ????


var long_trend = macd_histogram > 1 && macd_signal > 1;

var short_trend = macd_histogram < -1 && macd_signal < -1;


if ( long_trend && last_candle_stochastic < 30 && this_candle_stochastic > 30) {

	open_order(buy);

}

if ( short_trend && last_candle_stochastic > 70 && this_candle_stochastic < 70 ) {

	open_order(sell);

}


open_order(direction) {
	order_size, order_stop, order_limit, direction;
}
