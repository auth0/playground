
var codeMirror = CodeMirror;

var editor = codeMirror(document.querySelector('.js-editor'), {
  mode: 'javascript',
  lineWrapping: true,
  lineNumbers: JSON.parse(localStorage.lineNumbers || 'false'),
  extraKeys: {'Ctrl-Space': 'autocomplete', useGlobalScope: false, globalVars: true},
});

var previewEl = document.querySelector('.js-preview');
var errored = false;
var oldCode;

var startTemplate = _.template('var domain = \'contoso.auth0.com\';\nvar cid = \'DyG9nCwIEofSy66QM3oo5xU6NFs3TmvT\';\n\nvar widget = new Auth0Lock(cid, domain);\n\nwidget.show({\n  focusInput: false,\n  popup: true,\n}, function (err, profile, token) {\n  alert(err);\n});');

var scriptTemplate = _.template('<!DOCTYPE html> <html> <head> <title><\/title> <%= scripts %> <\/head> <body><script>window.onerror = function (e, _, line) { parent.postMessage(JSON.stringify({msg: e, line: line}), \'*\'); };<\/script> <script><%= code %><\/script><\/body> <\/html>');

var errorTemplate = _.template('<!DOCTYPE html> <html> <head> <title><\/title> <\/head> <body> <pre><%= error %><\/pre><\/body> <\/html>');


var scriptTagTemplate = function (src) {
  return _.template('<script src="<%= src %>"><\/script>')({src: src});
};

if (localStorage.text) {
  editor.setValue(localStorage.text);
} else {
  editor.setValue(startTemplate({}));
}

function setError(error) {
  previewEl.src = 'about:blank';
  previewEl.onload = function () {
    previewEl.onload = null;
    var val = errorTemplate({error: error});
    previewEl.contentDocument.open();
    previewEl.contentDocument.writeln(val);
    previewEl.contentDocument.close();
  };
}

window.addEventListener('message', function (e) {
  var error = JSON.parse(e.data);
  setError(JSON.stringify(error.msg) + ' in line: ' + error.line);
  errored = true;
}, false);

function setCode(code, scripts) {
  previewEl.onload = function () {
    previewEl.onload = null;
    var scriptsAsText = scripts.map(scriptTagTemplate).join('');
    var val = scriptTemplate({code: code, scripts: scriptsAsText});
    previewEl.contentDocument.open();
    previewEl.contentDocument.writeln(val);
    previewEl.contentDocument.close();
  };
  previewEl.src = 'about:blank';
  //document.getElementById('preview').src = "/empty.html";
}

function onChange(instance, force) {
  try {
    var code = instance.getValue();
    var syntax = esprima.parse(code, { tolerant: true, loc: true });
    var errors = syntax.errors;
    var scripts = [
      currentVersionScript(),
      'https://code.jquery.com/jquery-1.11.1.min.js'
    ];

    if (oldCode === undefined) { oldCode = code; }

    if(!errors.length) {
      localStorage.text = code;
      code = escodegen.generate(syntax);
      if (!force && (code === oldCode && !errored)) {
        return;
      }
      setCode(code, scripts);
      oldCode = code;
    } else {
      setError(errors);
      errored = true;
    }
  } catch (e) {
    setError(e);
    errored = true;
  }
}

function currentVersionScript() {
  return $('.version-select').val();
}

function processGithubTagsResponse(response) {
  var releases = _(response).map(function(x) {
    return x.name;
  }).filter(function(x) {
    return /v\d+\.\d+\.\d+/.test(x);
  }).map(function(x) {
    return {
      version: x,
      url: "//cdn.auth0.com/js/lock-" + x.slice(1) + ".min.js"
    };
  }).value();

  var select = $(".version-select");
  select.removeAttr("disabled");
  select.on("change", function() {
    var parent = $(previewEl).parent();
    $(previewEl).detach();
    parent.append("<iframe class='col-sm-6 js-preview preview'> </iframe>");
    previewEl = $('.js-preview').get(0);
    onChange(editor, true);
  });

  select.empty().append(_.map(releases, function(x) {
    return "<option value='" + x.url + "'>" + x.version + "</option>";
  }).join(' '));

  onChange(editor);
}

$.getJSON("https://api.github.com/repos/auth0/lock/tags", processGithubTagsResponse);

editor.on('change', _.debounce(onChange, 650));
