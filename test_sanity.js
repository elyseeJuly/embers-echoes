const fs = require('fs');

// Mock DOM
global.window = {};
global.document = {};
global.$ = function() { return { length: 0, attr: function(){return this;}, addClass: function(){return this;}, text: function(){return this;}, appendTo: function(){return this;}, prepend: function(){return this;}, find: function(){return {text:function(){return this;}, css:function(){return this;}};} }; };
global.jQuery = global.$;

// Mock $SM
global.$SM = { get: function() { return 0; } };

eval(fs.readFileSync('script/sanity.js', 'utf8'));

console.log('Sanity loaded');

try {
  Sanity.updateSanDisplay(50, 100);
  console.log('updateSanDisplay passed');
} catch (e) {
  console.error('Error in updateSanDisplay:', e);
}
