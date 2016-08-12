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
router.get('/crawl/', function (req, res, next) {
    const convert = "?$format=json&$inlinecount=allpages&$filter=year(bill_gazette_date) eq 2013";
    pawn.connect_cron_job(convert, res);
});

router.get('/crtest/', function (req, res, next) {
    xpdf.pdf_process_v4(res);
});





module.exports = router;