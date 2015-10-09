
var _ 				= require('lodash');
var chalk 			= require('chalk');
var cradle 			= require('cradle');
var inquirer 		= require('inquirer');

var db;
var changes = filteredChanges = toRestore = [];
var askAgain = true;

/**
 * [init description]
 * @param  {[type]} dbConnection [description]
 * @return {[type]}              [description]
 */
var init = function(dbConnection){

	db = dbConnection;

	setupQuestions();

	db.changes(function(err, list){
		changes = _.merge({}, list);
		filteredChanges = _.filter(list, {"deleted": true});

		beginQuestions();
	});
};

/**
 * [setupQuestions description]
 * @return {[type]} [description]
 */
var setupQuestions = function(){
	questions = [{
		type: 'rawlist',
		message: 'Would you like to:',
		name: 'restoreMode',
		choices: function(){
			return [{
				name: "Restore a single document?",
				value: "single"
			},{
				name: "Restore a range of documents?",
				value: "range"
			},{
				name: "Restore a list of documents?",
				value: "list"
			},{
				name: "Quit Restore?",
				value: "quit"
			}]
		}
	}];
}

/**
 * [beginQuestions description]
 * @return {[type]} [description]
 */
var beginQuestions = function(){

	inquirer.prompt( questions, function( answers ) {

		switch(answers.restoreMode){
			case "single":

				inquirer.prompt([{
					type: "input",
					name: "element",
					message: "Enter the sequence number of the document you wish to restore (i.e. 2631):",
					validate: function(answer){
						return !_.isEmpty(answer);
					}
				}], function( answers ){
					toRestore = _.filter(filteredChanges, {"seq": parseInt(answers.element)});
					initRestore();
				});


				break;
			case "range":

				inquirer.prompt([{
					type: "input",
					name: "elements",
					message: "Enter the sequence number range of the documents that you wish to restore (i.e. 2631-2788):",
					validate: function(answer){
						return !_.isEmpty(answer);
					}
				}], function( answers ){
					var range = answers.elements.split('-');
					range[0] = parseInt(range[0]);
					range[1] = parseInt(range[1]);
					toRestore = _.filter(filteredChanges, function(n){
						return (n.seq >= range[0] && n.seq <= range[1]);
					});
					initRestore();
				});

				break;
			case "list":
				console.log(chalk.red('Error: This method has not yet been implemented.'));
				break;
		}
	});

};

/**
 * [initRestore description]
 * @return {[type]} [description]
 */
var initRestore = function(){
	if(toRestore.length === 0){
		console.log(chalk.red('Error: You have not selected any documents to restore!'));
		beginQuestions();
	} else {
		doRestore();
	}

};

/**
 * [doRestore description]
 * @return {[type]} [description]
 */
var doRestore = function() {
	if(toRestore.length === 0){
		console.log(chalk.blue('Document Restore Complete.\n'));
		beginQuestions();
		return;
	}
	var tmpDoc = toRestore.shift();
	var targetRev = null;

	//save an empty doc to the server to be filled with the restored data
	db.save(tmpDoc.id, tmpDoc.changes[0].rev, {}, function(err, resp){ 
		if(err) { console.log(chalk.red('An error occurred restoring your document (step 1)')); console.log(chalk.red(err)); }

		//retrieve all available revisions of the target document
		db.get(tmpDoc.id, {revs_info: true}, function(err, resp){
			if(err) { console.log(chalk.red('An error occurred restoring your document (step 2)')); console.log(chalk.red(err)); }

			targetRev = resp._rev;

			//determine the taget document revision to restore (the one just prior to the delete)
			var tmpRev = resp._revs_info.shift();
			while(tmpRev.status !== "deleted"){
				tmpRev = resp._revs_info.shift();
			}
			var selectedRev = resp._revs_info.shift();

			//get the specific revision of the document that is intended to be restored
			db.get(tmpDoc.id, selectedRev, function(err, resp){
				if(err) { console.log(chalk.red('An error occurred restoring your document (step 3)')); console.log(chalk.red(err)); }

				//save the old version of the document to the new one
				db.save(tmpDoc.id, targetRev, resp, function(err, resp){ 
					if(err) { console.log(chalk.red('An error occurred restoring your document (step 4)')); console.log(chalk.red(err)); }
					console.log(chalk.green('Restore Successful! - ID: '+ resp.id)); 

					doRestore();
				});
			});
		});
	});
};


module.exports.init = init;