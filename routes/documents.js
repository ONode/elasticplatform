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
        to: 15
    }, res);
});

module.exports = router;