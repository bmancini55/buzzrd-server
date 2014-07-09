// Module dependencies
var JsonResponse  = require('jsonresponse')
  , fs = require('fs')
  , multiparty = require('multiparty')
  , util = require('util');

// Upload an image into the uploads directory
exports.upload = function(req, res) {

  var form = new multiparty.Form();

  form.parse(req, function(err, fields, files) {
    if (err) {
      res.writeHead(400, {'content-type': 'text/plain'});
      res.end("invalid request: " + err.message);
      return;
    }

    var file = files.image[0];

    var ctype = file.headers['content-type'];
    var ext = ctype.substr(ctype.indexOf('/')+1);
    if (ext) {ext = '.' + ext; } else {ext = '';}

    var uuid = require('node-uuid');
    var uuid1 = uuid.v1();

    var  filename = uuid1 + ext,
      uploadsDirectory = process.cwd() + '/uploads/',
      filePath = uploadsDirectory + filename;

    if (!fs.existsSync(uploadsDirectory)) {
      fs.mkdirSync(uploadsDirectory);
    }
   
    fs.rename(file.path, filePath, function(err) {
        if (err) {
          res.send(500, new JsonResponse(err));
        }
        else{
          res.send(new JsonResponse(null, {'imageURI' : '/uploads/' + filename}));
          // res.send(201,{'imageURI' : '/uploads/' + filename});
        }
    });
  });
};