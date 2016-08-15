const express = require('express');
const router = express.Router();
const elastic = require('../common/elasticsearch');
const pawn = require('../common/pawn');
const xpdf = require('../common/testxpdf');
/** GET suggestions */
router.get('/suggest/:input', function (req, res, next) {
    elastic.getSuggestions(req.params.input).then(function (result) {
        res.json(result)
    });
});
/** POST document to be indexed */
router.post('/', function (req, res, next) {
    elastic.addDocument(req.body).then(function (result) {
        res.json(result);
    });
});
/**   */
router.get('/crawl/:year', function (req, res, next) {
    pawn.searchByYear(req, res);
});
router.get('/test/', function (req, res, next) {
    xpdf.pdf_demo_text({
            remove_space_asian_character: true,
            new_paragraph: true,
            from: 0,
            to: 20
        },
        res);
});
router.get('/test_v1/', function (req, res, next) {
    xpdf.pdf_demo_text({
        remove_space_asian_character: false,
        new_paragraph: false,
        from: 0,
        to: 15
    }, res);
});
router.get('/test_v2/', function (req, res, next) {
    xpdf.pdf_demo_text({
        remove_space_asian_character: true,
        new_paragraph: false,
        from: 0,
        to: 15,
        customwork: function (line) {
            /**
             * look ahead selection
             * \d{3,4}(?=[\u7acb\u6cd5\u6703\u2500]+(19\d\d|200\d|201\d)[\u5e74](1\d|\d)[\u6708](1\d|2\d|3\d|\d)[\u65e5])
             *
             * select the number
             *
             *
             * (\d\d\d\d)[\u7acb]
             * catch the pages first and second
             */
            /*line = line.replace(/([\u65e5])(\d\d\d\d)/g, function (ex) {
             return "$1(page no.$2)";
             });
             line = line.replace(/(\d\d\d\d)([\u7acb])/g, function (ex) {
             return "(page no.$1)$2";
             });*/
            /**
             * http://www.elasticsearchtutorial.com/elasticsearch-in-5-minutes.html
             *
             *
             * catch all
             * 立法會─2013年2月6日
             */
            line = line.replace(/[\u7acb\u6cd5\u6703\u2500]+(19\d\d|200\d|201\d)[\u5e74](1\d|\d)[\u6708](1\d|2\d|3\d|\d)[\u65e5]/g, '');
            return line;
        }
    }, res);
});

var V5 = require("./../common/pdf_process_v5");

router.get('/localmock/', function (req, res, next) {
    const dest = path.dirname(module.main) + "/tmp/";
    var path = dest + "hansard_0_.pdf";
/*
    var getdoc = new V5(task.out, task.isEnglish, task, callback);
    getdoc.on("scanpage", function (doc) {
        doc.data_internal_key = task.data_internal_key;
        doc.data_read_order = task.data_read_order;
        doc.data_source_url = task.url;
        console.log("> xpdf preview", "===================");
        if (doc.content.length > 0) {
            console.log("> doc title", doc.title);
            //console.log("> xpdf the internal key", doc.data_internal_key);
            console.log("> xpdf data length", doc.content.length);
            // task.elengine.addDoc(doc);
        } else {
            console.log("> xpdf preview", "document skipped");
        }
        console.log("> xpdf preview", "===================");
    });
    getdoc.on("complete", function () {
        return callback(null, task);
    });*/

});
module.exports = router;