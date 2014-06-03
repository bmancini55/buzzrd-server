// Module dependencies
var JsonResponse  = require('../common/jsonresponse')
  , fs = require('fs');

// Upload an image into the uploads directory
exports.upload = function(req, res) {

  var ctype = req.get("content-type");
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
 
  var writable = fs.createWriteStream(filePath);
  req.pipe(writable);

  req.on('end', function (){
    res.send(201,{'imageURI' : '/uploads/' + filename});
  });

  writable.on('error', function(err) {
    res.send(500,err);
  });
};