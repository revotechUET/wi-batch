## Authenticate 
------
Add token to header, payload, url:
```javascript
  req.body.token || req.query.token || req.header['x-access-token'] || req.get('Authorization');
```
## Create new workflow
------
#### POST to **/workflow/generate** :
```json
{
	"username": "hoang",
	"password": "1",
	"workflowName" : "hoang1q",
	"host" : "13.250.1.60",
	"port" : 80,
	"path" : "/upload/lases",
	"dataDir" : "sample"
}
```
#### GET **/workflow/generate**:
```json
{
	"username": "hoang",
	"password": "1",
	"workflowName" : "hoang1q",
	"host" : "13.250.1.60",
	"port" : 80,
	"path" : "/upload/lases",
	"dataDir" : "sample"
}
```
