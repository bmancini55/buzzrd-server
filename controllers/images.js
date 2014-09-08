// Module dependencies
var debug = require('debug')('images')
  , JsonResponse  = require('jsonresponse')
  , fs = require('fs')
  , multiparty = require('multiparty')
  , util = require('util')
  , AWS = require('aws-sdk')
  , configHelper  = require('../common/confighelper')
  , config = configHelper.env()
  , uuid = require('node-uuid')

  , s3Bucket = config.aws.bucket;

// Setup AWS
AWS.config.update({ 
  accessKeyId: config.aws.accessKeyId, 
  secretAccessKey: config.aws.secretAccessKey
});


/**
 * Upload an image into the uploads directory
 */
exports.uploadFS = function(req, res) {

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


/** 
 * Uploads to s3
 */
exports.upload = function(req, res) {

  var ctype = req.get("content-type")
        , ext = ctype.substr(ctype.indexOf('/')+1)
        , uuid1 = uuid.v1()
        , fileName
        , fileKey
        , s3;

  if (ext) {ext = '.' + ext; } 
      else {ext = '';}
      
  fileName = uuid1 + ext;
  fileKey = 'profiles/' + fileName;
    
  s3 = new AWS.S3();

  s3.putObject({ 
      Bucket: s3Bucket, 
      Key: fileKey,
      ACL: 'public-read',
      Body: req,
      ContentType: ctype,
      ContentLength: parseInt(req.headers["content-length"])
    }, function(err, data) {
      if(err) res.send(500, new JsonResponse(err));
      else res.send(new JsonResponse(null, {'imageURI' : fileKey }));
  });
};