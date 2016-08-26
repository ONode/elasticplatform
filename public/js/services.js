/*
 * Calaca - Search UI for Elasticsearch
 * https://github.com/romansanchez/Calaca
 * http://romansanchez.me
 * @rooomansanchez
 * 
 * v1.2.0
 * MIT License
 */
String.prototype.trunc = String.prototype.trunc || function (n) {
    var char_chinese = /[\u4E00-\u9FCC\u3400-\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d]/;

    var isChinese = char_chinese.test(this);
    var delim = isChinese ? '…' : '&hellip;';
    return (this.length > n) ? this.substr(0, n - 1) + delim : this;
  };

function truncateOnWord(str, limit) {
  var trimmable = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u2028\u2029\u3000\uFEFF';
  var reg = new RegExp('(?=[' + trimmable + '])');
  var words = str.split(reg);
  var count = 0;
  return words.filter(function (word) {
    count += word.length;
    return count <= limit;
  }).join('');
}

/* Service to Elasticsearch */
Calaca.factory('calacaService', ['$q', 'esFactory', '$location', '$http', function ($q, elasticsearch, $location, $http) {
    //Set default url if not configured
    CALACA_CONFIGS.url = (CALACA_CONFIGS.url.length > 0) ? CALACA_CONFIGS.url : $location.protocol() + '://' + $location.host() + ":9200";

    var client = elasticsearch({host: CALACA_CONFIGS.url});
    var year = CALACA_CONFIGS.index_name;
    var search = function (query, mode, offset) {
      var deferred = $q.defer();
      if (query.length == 0) {
        deferred.resolve({timeTook: 0, hitsCount: 0, hits: []});
        return deferred.promise;
      }
      client.search({
        "index": year,
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
          hitsIn[i]._source.content = hitsIn[i]._source.content.trunc(500);
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


    var json_on_it = function () {
      var deferred = $q.defer();
      $http.get('js/persons.json').success(function (response) {
        deferred.resolve(response);
      });
      return deferred.promise;
    };

    return {
      "search": search,
      "persons": json_on_it
    };

  }]
);
