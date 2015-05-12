var express = require('express');
var _ = require('lodash');
var fs = require('fs');
var cors = require('cors'); // "Request" library
var ECT = require('ect');
var busboi = require('connect-busboy');
var bodyParser = require('body-parser');
var stream = require('stream');
var util = require('util');
var ffmpeg = require('fluent-ffmpeg');

var DESTINATION = __dirname + '/';

var ectRenderer = ECT({
    watch: true,
    root: __dirname + '/views',
    ext: '.ect'
});

function BufferStream(source) {

    if (!Buffer.isBuffer(source)) {

        throw (new Error("Source must be a buffer."));

    }
    stream.Readable.call(this);

    this._source = source;
    this._offset = 0;
    this._length = source.length;
    this.on("end", this._destroy);

}

util.inherits(BufferStream, stream.Readable);


BufferStream.prototype._destroy = function() {

    this._source = null;
    this._offset = null;
    this._length = null;

};

BufferStream.prototype._read = function(size) {
    if (this._offset < this._length) {
        this.push(this._source.slice(this._offset, (this._offset + size)));
        this._offset += size;

    }
    if (this._offset >= this._length) {
        this.push(null);
    }
};

var EXPRESS = (function() {

    var server;
    var app = express();

    app.use(cors({
        allowedOrigins: [
            'localhost',
            'app://',
            'app'
        ]
    }));

    app.use(busboi());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: false
    }));

    app.set('view engine', 'ect');
    app.engine('ect', ectRenderer.render);

    server = app.listen(3000);

    console.log("Listening localhost:3000");

    app.get('/', function(req, res) {
        res.render('file-upload');
    });

    var videoResponse;
    var videoRequest;

    /*-------------------*/
    //POST
    /*-------------------*/

    app.post('/fileupload', function(req, res) {
        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function(fieldname, file, fullname) {
            var filename = fullname.substring(0, fullname.length - 4);
            var ext = fullname.substring(fullname.length - 4, fullname.length).toLowerCase();
            console.log("Uploading: " + filename, 'to: ', DESTINATION);
            console.log("Uploading: " + ext, 'to: ', DESTINATION);
            var fullPath = DESTINATION + filename + ext;
            console.log(fullPath);
            fstream = fs.createWriteStream(fullPath);
            file.pipe(fstream);
            fstream.on('close', function() {
                if (ext !== '.mp4') {
                    _encodeMp4(DESTINATION + filename, ext);
                } else {
                    _sendVideoResponse(fullPath);
                }
            });
            res.send({
                status: 'pending upload...'
            });
        });
    });

    function _encodeMp4(pathNoExt, ext) {
        console.log(pathNoExt, ext);
        ffmpeg(pathNoExt + ext)
            .format('mp4')
            .output(pathNoExt + '.mp4')
            .on('start', function(cmd) {
                console.log(cmd);
            })
            .on('end', function() {
                _sendVideoResponse(pathNoExt + '.mp4');
            })
            .run();
    }

    function _sendVideoResponse(path) {

        if (videoResponse) {
            var range = videoRequest.headers.range;
            var positions = range.replace(/bytes=/, "").split("-");
            var start = parseInt(positions[0], 10);
            fs.stat(path, function(err, stats) {
                var total = stats.size;
                var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
                var chunksize = (end - start) + 1;

                videoResponse.writeHead(206, {
                    "Content-Range": "bytes " + start + "-" + end + "/" + total,
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunksize,
                    "Content-Type": "video/mp4"
                });

                var videoFile = fs.readFileSync(path);
                var bs = new BufferStream(videoFile)
                    .pipe(videoResponse);
            });
        }
    }

    /*-------------------*/
    //SEND FILES
    /*-------------------*/

    app.get('/file-upload.js', function(req, res, next) {
        res.sendFile(__dirname + '/js/file-upload.js');
    });

    app.get('/file-upload.css', function(req, res, next) {
        res.sendFile(__dirname + '/css/file-upload.css');
    });

    app.get('/myupload', function(req, res, next) {
        videoRequest = req;
        videoResponse = res;
    });

})();

module.exports = EXPRESS;