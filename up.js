var fs = require("fs");
var request = require("request");

var options = { method: 'POST',
  url: 'http://localhost:3000/upload/lases',
  headers: 
   { 'Cache-Control': 'no-cache',
     'x-access-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRvZHYiLCJwYXNzd29yZCI6ImM0Y2E0MjM4YTBiOTIzODIwZGNjNTA5YTZmNzU4NDliIiwid2hvYW1pIjoibWFpbi1zZXJ2aWNlIiwiaWF0IjoxNTE1NjY0Mzk5LCJleHAiOjE1MTU4MzcxOTl9.LuT1LRRG2h8aPxo-z-R5GFLGeZ64brjIR27y_EKQ62Y',
     'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' },
  formData: 
   {
    file: 
      {
	value: fs.createReadStream("/Users/dodang/Dropbox/Wellinsight cloud project/Technical specs/WI format import file/1.Las/Las 3.0/1X_Techlog_30.las"),
        options: 
         { filename: '/Users/dodang/Dropbox/Wellinsight cloud project/Technical specs/WI format import file/1.Las/Las 3.0/1X_Techlog_30.las',
           contentType: null } } } };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});

