/**
 * Created by zJJ on 8/15/2016.
 */
const elasticsearch = require('elasticsearch'),
  util = require("util"),
  _ = require("lodash"),
  NGramsZH = require("natural").NGramsZH,
  events = require("events");
const indexName = process.env.SEARCHFARM_INDEXPREFIX || "legco-";
//const wordfreqProgram = require('wordfreq');
function elClient(config) {
  events.call(this);
  this.options = config;
  this.options.connection_url = process.env.BONSAI_URL || 'https://woygrxy:kxs3a7a752xn27y0@cypress-6596621.us-east-1.bonsai.io';
  if (this.isReady()) {
    const elasticClient = new elasticsearch.Client({
      host: this.options.connection_url,
      log: 'info',
      keepAlive: true
    });
    elasticClient.ping({
        requestTimeout: 30000,
        hello: "elasticsearch"
      },
      function (error) {
        if (error) {
          console.error('elasticsearch cluster is down!');
        } else {
          console.log('EL is all well');
        }
      }
    );
    this.esclient = elasticClient;
  } else {
    console.log("Elasticsearch is not connected.")
  }
}
util.inherits(elClient, events);
elClient.prototype.getIndexName = function () {
  return indexName + this.options.year;
};
elClient.prototype.isReady = function () {
  return this.options.connection_url != '';
};
elClient.prototype.deleteIndex = function () {
  return this.esclient.indices.delete({
    index: this.getIndexName(),
    ignore: [404]
  });
};
elClient.prototype.initIndex = function () {
  return this.esclient.indices.create({
    index: this.getIndexName()
  });
};
elClient.prototype.indexExists = function () {
  return this.esclient.indices.exists({
    index: this.getIndexName()
  });
};
elClient.prototype.initMapping = function () {
  return this.esclient.indices.putMapping({
    index: this.getIndexName(),
    type: "page",
    body: {
      properties: {
        title: {type: "string", index: "analyzed", analyzer: "trans_standard"},
        content: {type: "string", index: "analyzed", analyzer: "trans_standard"},
        speaker: {type: "string", index: "analyzed", analyzer: "trans_standard"},
        createdate: {type: "date", index: "not_analyzed"},
        metapages: {type: "string", index: "not_analyzed"},
        metapath: {type: "string", index: "not_analyzed"},
        metasrc: {type: "string", index: "not_analyzed", "format": "Url"},
        metaikey: {type: "number", index: "not_analyzed"},
        suggest: {type: "completion", analyzer: "simple", search_analyzer: "simple", payloads: true}
      }
    },
    ignore: [404]
  });
};
elClient.prototype.addDoc = function (document) {
  //  var timeInMs = new Date();
  var timeInMs = Date.now();
  //timeInMs.toUTCString()
  //id: timeInMs,
  //console.log(document);
  var pre_send = {
    index: this.getIndexName(),
    type: "page",
    body: {
      content: document.content,
      speaker: document.data_speaker,
      createdate: document.thread_date,
      metapages: "p" + document.scanrange.start + " - " + document.scanrange.end,
      metasrc: document.data_source_url,
      metaikey: document.data_internal_key,
      metapath: "legco/hansard/" + document.data_read_order,
      suggest: {
        input: [],
        output: document.data_bill_title,
        payload: {
          "metakey": document.data_internal_key
        }
      }
    }
  };
  var name = document.data_speaker;
  var check_valid_subfix = name.substring(name.length - 2, name.length);
  var check_valid_surname = name.substring(0, 1);

  var c = NGramsZH.bigrams(document.data_bill_title);

  pre_send.body.suggest.input = [];
  var dict = ["年", "草案", "(修訂)", "2012", "2013", "2014", "2015", "2016"];
  var pain = new String(document.data_bill_title);
  _.forEach(dict, function (definedword) {
    if (document.data_bill_title.indexOf(definedword) > -1) {
      pre_send.body.suggest.input.push(definedword);
      pain = pain.replace(definedword, "");
    }
  });
  pre_send.body.suggest.input.push(pain);
  if (check_valid_subfix == "議員") {
    var prename = check_valid_surname + check_valid_subfix;
    pre_send.body.suggest.input.push(prename);
    pre_send.body.suggest.output = pre_send.body.suggest.output + " - " + name;
  }
  // title: document.data_bill_title
  // console.log("result index===>", pre_send.body.suggest.input);
  // console.log("result index===>", pre_send);
  return this.esclient.index(pre_send);
};
elClient.prototype.getSuggestions = function (input) {
  return this.esclient.suggest({
    index: this.getIndexName(),
    type: "page",
    body: {
      docsuggest: {
        text: input,
        completion: {
          field: "suggest",
          fuzzy: true
        }
      }
    }
  })
};

exports.instance = elClient;
