"use strict"

var _ 				= require('lodash');
var chalk 			= require('chalk');
var cradle 			= require('cradle');
var inquirer 		= require('inquirer');
var jsonfile 		= require('jsonfile');

//** Task Modules **//
var docRestore		= require('./docRestore/restore')

var config = {
	file: './config.json',
	data: null
};

var questions;

var init = function(){

	process.title = "Tangerine: Sysadmin Tools";

	console.log(chalk.yellow(
		'--------------------------------\n'+
		'Tangerine: Sysadmin Tools\n'+
		'--------------------------------'
	));

	console.log(chalk.blue('Loading Configuration ('+ config.file +')...'));

	jsonfile.readFile(config.file, function(err, obj) {
	  if(err){
	  	console.log(chalk.red('There was an error loading your configuration file. Ensure that your config.json is setup correctly and try again.'));
	  	return;
	  }
	  config.data = obj;
	  setupQuestions();
	  beginQuestions();
	});
};

var setupQuestions = function(){
	questions = [{
		type: 'list',
		message: 'Which database server would you like to connect to?',
		name: 'dbconn',
		choices: function(){
			var choices = [];
			_.forIn(config.data, function(val, key){ 
				choices.push({
					name: key,
					value: new(cradle.Connection)(val.url, val.port, {auth: {username: val.username, password: val.password}})
				}); 
			});
			return choices;
		},
		default: 0
	},{
		type: "input",
		name: "dbName",
		message: "Enter the target DB name:",
		validate: function(answer){
			return !_.isEmpty(answer);
		}
	},{
		type: 'rawlist',
		message: 'What task would you like to perform?',
		name: 'task',
		choices: function(){
			return [{
				name: "Restore Deleted Documents.",
				value: docRestore
			}]
		}
	}];
}

var beginQuestions = function(){

	inquirer.prompt( questions, function( answers ) {
		var db = answers.dbconn.database(answers.dbName);
		db.exists(function (err, exists) {
		    if (err) { 
		    	console.log(chalk.red(err));

		    } else if (!exists) {
				console.log(chalk.red('Database does not exist'));

		    } else { 

		    	answers.task.init(db);

		    }
		});
	});
};

init();