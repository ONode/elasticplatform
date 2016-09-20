/*
 * Calaca - Search UI for Elasticsearch
 * https://github.com/romansanchez/Calaca
 * http://romansanchez.me
 * @rooomansanchez
 * 
 * v1.2.0
 * MIT License
 */

/* Configs */
/**
 *
 * url - Cluster http url
 * index_name - Index name or comma-separated list
 * type - Type
 * size - Number of results to display at a time when pagination is enabled.
 * search_delay - Delay between actual search request in ms. Reduces number of queries to cluster by not making a request on each keystroke. 
 */
//	url: "https://cypress-6596621.us-east-1.bonsai.io",
//	url: "http://ec2-54-69-72-231.us-west-2.compute.amazonaws.com:9201",
//	url: "http://localhost:9200",
var CALACA_CONFIGS = {
	url: "http://ec2-54-69-72-231.us-west-2.compute.amazonaws.com:9200",
	index_name: "legco-",
	type: "page",
	size: 10,
	search_delay: 500
};
