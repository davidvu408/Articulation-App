const cheerio = require('cheerio');
const request = require('request');
const mysql = require('mysql');

const collegeListURL = `http://info.sjsu.edu/web-dbgen/artic/all-course-to-course.html`;

const prefixURL = `http://info.sjsu.edu`;


let con = mysql.createConnection({
    host: "rds-mysql.cvnucdsnyaiy.us-east-2.rds.amazonaws.com",
    user: "davidvu408",
    password: "A1ivalice",
    database: "ArticulationApp"
});

function populateSJSUclasses() {
    // Iterates through all college tables, finds index of table with most record entries (indicating the fullest list of SJSU classes)
    con.query("SELECT Name FROM colleges", function(err, result) {
        if (err) throw err;
        let collegeNamesArr = [];
        let unionQuery = "";
        for(let i = 0; i < result.length; i++) {
            collegeNamesArr.push(result[i].Name);
            if(i + 1 === result.length){
                unionQuery += "SELECT SJSU_CLASS FROM \`" +  result[i].Name + "\`"
            } else {
                unionQuery += "SELECT SJSU_CLASS FROM \`" +  result[i].Name + "\` UNION ";
            }
            
        }
        unionQuery = "SELECT SJSU_CLASS FROM(" + unionQuery + ") x";
        //console.log(unionQuery);
        con.query(unionQuery, function(err, result) {
            if (err) throw err;
            let sjsuClasses = [];
            for(let i = 0; i < result.length; i++) {
                let temp = [];
                temp.push(result[i].SJSU_CLASS);
                sjsuClasses.push(temp);
            }
            //console.log(sjsuClasses);
            con.query("INSERT INTO sjsu_classes (Name) VALUES ?", [sjsuClasses], function(err, result) {
                if (err) throw err;
                console.log("Successfully added SJSU classes");
            });
        });
    });
}

//populateSJSUclasses();

function populateCollegesTable() {
    request(collegeListURL, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            let $ = cheerio.load(body);
            let colleges = [];
            $('table').last().find('tr').each(function(i, elem) {
                let temp = [];
                temp.push($(this).text());
                temp.push($(this).find('a').attr('href'));
                colleges.push(temp);
            });
            //console.log(colleges);
            addCollegesToDB(colleges);
        }
    });

    function addCollegesToDB(collegesArr) {
        con.connect(function(err) {
            if (err) throw err;
            con.query("INSERT INTO colleges (Name, URL) VALUES ?", [collegesArr], function(err, result) {
                if (err) throw err;
                console.log("Successfully added colleges");
            });
        });
    }
}

// Adds colleges to database
//populateCollegesTable();

function populateAllCollegeTables() {
    con.connect(function(err) {
        if (err) throw err;
        con.query("SELECT Name FROM colleges", function(err, result) {
            let collegeNamesArr = [];
            for (let i = 0; i < result.length; i++) {
                console.log(result[i].Name);
                populateIndividualCollegeTable(result[i].Name);
            }
        });
    });
}

// Refers to 'colleges' table to get collegeName URL, loads table data from the site, and stores that data in a MySQL table under collegeName
function populateIndividualCollegeTable(collegeName) {
    // Get college URL from 'colleges' table
    con.query("SELECT URL FROM colleges WHERE Name = \'" + collegeName + "\'", function(err, result) {
        if (err) throw err;
        getCollegeData(result[0].URL); // result: Returns RowDataPacket with URL of selected collegeName
    });

    // Loads URL from 'colleges table', gets SJSU classes and the college equivalent for articulation
    function getCollegeData(url) {
        request((prefixURL + url), function(error, response, body) {
            if (!error && response.statusCode == 200) {
                let $ = cheerio.load(body);
                let collegeDataArr = [];
                $('table').last().find('tr td[colspan="3"]').parent().nextUntil('tr[style="height:10px"]').each(function(i, elem) {
                    let temp = [];

                    if (!($(this).html().includes('h3') || $(this).text() === '')) {
                        temp.push($(this).children().first().text()); // SJSU classes

                        // Formatting
                        let collegeEquivalent = $(this).children().last().text();
                        if (collegeEquivalent.includes('AND')) {
                            collegeEquivalent = collegeEquivalent.replace('AND', 'AND   ');
                        } else if (collegeEquivalent.includes('OR')) {
                            //console.log('true');
                            collegeEquivalent = collegeEquivalent.replace('OR', 'OR   ');
                        }

                        temp.push(collegeEquivalent);

                        collegeDataArr.push(temp);
                    }
                });
                //console.log(collegeDataArr);
                createIndividualCollegeTable(collegeDataArr);
            }

        });
    } // end getCollegeData(url)

    // Create MySQL table for SJSU and individual college class-to-class articulation
    function createIndividualCollegeTable(collegeDataArr) {
        con.query("CREATE TABLE \`" + collegeName + "\` (ID int NOT NULL AUTO_INCREMENT PRIMARY KEY, SJSU_CLASS varchar(255) NOT NULL, COLLEGE_EQUIVALENT varchar(255) NOT NULL)", function(err, result) {
            if (err) throw err;
            addCollegeData(collegeDataArr);
        });
    }

    // Adds data from getCollegeData(url) to table created from createIndividualCollegeTable(collegeDataArr)
    function addCollegeData(collegeDataArr) {
        con.query("INSERT INTO \`" + collegeName + "\` (SJSU_CLASS, COLLEGE_EQUIVALENT) VALUES ?", [collegeDataArr], function(err, result) {
            if (err) throw err;
            console.log("Successfully added colleges");
        });
    }

} // end populateIndividualCollegeTable(collegeName)


//populateAllCollegeTables();