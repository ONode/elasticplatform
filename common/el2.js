/**
 * Created by zJJ on 8/15/2016.
 */
const elasticsearch = require('elasticsearch'),
    util = require("util"),
    events = require("events");
const indexName = process.env.SEARCHFARM_INDEXPREFIX || "legco-";
//const wordfreqProgram = require('wordfreq');
function elClient(config) {
    this.options = config;
    this.options.connection_url = process.env.BONSAI_URL || '';
    if (this.isReady()) {
        const elasticClient = new elasticsearch.Client({
            host: this.options.connection_url,
            log: 'info',
            keepAlive: false
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
                path: {type: "string", index: "not_analyzed"},
                title: {type: "string", index: "analyzed", analyzer: "english"},
                content: {type: "string", index: "analyzed", analyzer: "trans_standard"},
                source: {type: "string", index: "not_analyzed", "format": "Url"},
                doc_index: {type: "number", index: "not_analyzed"},
                read: {type: "number", index: "not_analyzed"},
                suggest: {type: "completion", analyzer: "simple", search_analyzer: "simple", payloads: true}
            }
        }
    });
};
elClient.prototype.addDoc = function (document) {
    //  var timeInMs = new Date();
    var timeInMs = Date.now();
    // timeInMs.toUTCString()
    //    id: timeInMs,
    return this.esclient.index({
    
        index: this.getIndexName(),
        type: "page",
        body: {
            path: "legco/hansard/" + document.data_read_order,
            title: document.title,
            content: document.content,
            source: document.data_source_url,
            doc_index: document.data_internal_key,
            read: document.data_read_order,
            suggest: {input: document.title.split(" "), output: document.title, payload: document.metadata || {}}
        }
    });
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
util.inherits(elClient, events.EventEmitter);
exports.instance = elClient;
