/**
 * Created by zJJ on 8/15/2016.
 */
const elasticsearch = require('elasticsearch'),
    util = require("util"),
    events = require("events");
const indexName = "legco-";
//const wordfreqProgram = require('wordfreq');
function elClient(config) {
    this.options = config;
    this.options.connection_url = process.env.BONSAI_URL || '';
    if (this.isReady()) {
        const elasticClient = new elasticsearch.Client({
            host: this.options.connection_url,
            log: 'info'
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
        index: this.getIndexName()
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
        type: "document",
        body: {
            properties: {
                path: {type: "string", index: "not_analyzed"},
                title: {type: "string", analyzer: "english"},
                content: {type: "string", index: "analyzed", analyzer: "trans_standard"},
                source: {type: "string", index: "not_analyzed"},
                suggest: {
                    type: "completion",
                    analyzer: "simple",
                    search_analyzer: "simple",
                    payloads: true
                }
            }
        }
    });
};

elClient.prototype.addDoc = function (document) {
    return this.esclient.index({
        index: this.getIndexName(),
        type: "document",
        body: {
            path: "legco/hansard/" + document.data_read_order,
            title: document.title,
            content: document.content,
            source: document.src,
            suggest: {
                input: document.title.split(" "),
                output: document.title,
                payload: document.metadata || {}
            }
        }
    });
};
elClient.prototype.getSuggestions = function (input) {
    return this.esclient.suggest({
        index: this.getIndexName(),
        type: "document",
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
