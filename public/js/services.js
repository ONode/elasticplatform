/*
 * Calaca - Search UI for Elasticsearch
 * https://github.com/romansanchez/Calaca
 * http://romansanchez.me
 * @rooomansanchez
 * 
 * v1.2.0
 * MIT License
 */
String.prototype.trunc = String.prototype.trunc ||
    function (n) {
        return (this.length > n) ? this.substr(0, n - 1) + '&hellip;' : this;
    };
/* Service to Elasticsearch */
Calaca.factory('calacaService', ['$q', 'esFactory', '$location', function ($q, elasticsearch, $location) {
        //Set default url if not configured
        CALACA_CONFIGS.url = (CALACA_CONFIGS.url.length > 0) ? CALACA_CONFIGS.url : $location.protocol() + '://' + $location.host() + ":9200";

        var client = elasticsearch({host: CALACA_CONFIGS.url});
        var search = function (query, mode, offset) {
            var deferred = $q.defer();
            if (query.length == 0) {
                deferred.resolve({timeTook: 0, hitsCount: 0, hits: []});
                return deferred.promise;
            }
            client.search({
                "index": CALACA_CONFIGS.index_name,
                "type": CALACA_CONFIGS.type,
                "body": {
                    "size": CALACA_CONFIGS.size,
                    "from": offset,
                    "query": {
                        "query_string": {
                            "query": query
                        }
                    }
                }
            }).then(function (result) {
                var i = 0, hitsIn, hitsOut = [], source;
                hitsIn = (result.hits || {}).hits || [];
                for (; i < hitsIn.length; i++) {
                    hitsIn[i]._source.content = hitsIn[i]._source.content.trunc(30);
                    console.log(hitsIn[i]);
                    source = hitsIn[i]._source;
                    source._id = hitsIn[i]._id;
                    source._index = hitsIn[i]._index;
                    source._type = hitsIn[i]._type;
                    source._score = hitsIn[i]._score;
                    hitsOut.push(source);
                }
                deferred.resolve({timeTook: result.took, hitsCount: result.hits.total, hits: hitsOut});
            }, deferred.reject);

            return deferred.promise;
        };

        return {
            "search": search
        };

    }]
);
