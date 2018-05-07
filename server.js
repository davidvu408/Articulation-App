const express = require('express');
const app = express();
const mysql = require('mysql');
const bodyParser = require('body-parser');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

const con = mysql.createConnection({
/** REMOVED FOR PUBLIC VIEW **/
});


con.connect(function(err) {
    if (err) throw err;
    app.get('/', function(req, res) {
        res.send('index.html');
    });

    app.post('/', function(req, res) {
        let formObj = req.body;
        let className = formObj.className;
        let collegeName = formObj.collegeName;
        let queryCommand = "SELECT COLLEGE_EQUIVALENT FROM \`" + collegeName + "\` WHERE SJSU_CLASS = \'" + className + "\'";
        //console.log(queryCommand);
        con.query(queryCommand, function(err, result) {
            if (err) throw err;
            if(result[0] === undefined){
                formObj.COLLEGE_EQUIVALENT = 'No Current Equivalent';
            } else {
                formObj.COLLEGE_EQUIVALENT = result[0].COLLEGE_EQUIVALENT;
            }
            
            res.send(formObj);
        });
    
    });

    app.get('/initClassNames', function(req, res) {
        con.query("SELECT Name FROM sjsu_classes", function(err, result) {
            let classNameArr = [];
            for (let i = 0; i < result.length; i++) {
                classNameArr.push(result[i].Name);
            }
            res.send(classNameArr);
        });
    });

    app.get('/initCollegeNames', function(req, res) {
        con.query("SELECT Name FROM colleges", function(err, result) {
            let collegeNameArr = [];
            for (let i = 0; i < result.length; i++) {
                collegeNameArr.push(result[i].Name);
            }
            res.send(collegeNameArr);
        });
    });


});


app.get('/getSJSUclassNames', function(req, res) {

});

app.get('/getOtherCollegeNames', function(req, res) {
    con.connect(function(err) {
        if (err) throw err;

    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`);
});