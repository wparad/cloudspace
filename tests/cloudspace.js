'use strict;'
var esprima = require('esprima');
var mocha = require('mocha');
var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

describe('bin/cloudspace.js', function() {
	describe('Syntax', function () {
		it('Should be valid Javascript', function() {
			try {
				var content = fs.readFileSync(path.resolve('bin/cloudspace.js')).toString('utf-8');
				if (content[0] === '#' && content[1] === '!') { content = '//' + content.substring(2); }
				esprima.parse(content, { sourceType: 'script' });
				assert(true);
			}
			catch(e) {
				console.log(e);
				assert(false, JSON.stringify(e));
			}
		});
	});
});