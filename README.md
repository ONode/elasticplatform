## MeetingMiner

Foundation of Legco 2016

Binary Frameworks:
[Poppler 0.37.0](https://poppler.freedesktop.org/),
[Tesseract 3.04.01](https://github.com/tesseract-ocr/tesseract),
[Ghostscript 9.14](http://ghostscript.com/download/),
[Xpdf 3.04 + Chinese suppport](http://www.foolabs.com/xpdf/download.html),
[Pdfminer](http://www.unixuser.org/~euske/python/pdfminer/index.html),
[cpdf](https://github.com/coherentgraphics/cpdf-binaries),
[SCWS](https://gist.github.com/tureki/9523547),
Node.js

Supported API
Test for development mode
`api/crawl/v4/test_year_2016`

Real scan
`api/crawl/v3/:yearfiscal`
`api/crawl/v2/:start_from/`

Crawling website
`api/test_webcrawler/`
`api/apitest_v1/`

### How to start
1. Connect and install the elasticsearch 5.2.0 on AWS ec2 instance and retrieve the instance url.
2. Deploy this git to another instance for client server
3. configuration of connection url between frontend and backend with same port 9200. 
4. Get the test app running

### Any other questions
please make the inquries to me by email.
jobhesk [  @] gmail.com
