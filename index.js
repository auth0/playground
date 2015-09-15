
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
      localStorage.code[currentRelease.lib] = code;
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

editor.on('change', _.debounce(onChange, 650));


var lockSelect = $(".lock-select");
var versionSelect = $(".version-select");
var libs = ["lock", "lock-passwordless"];
var versions = {};
var currentRelease = {};

function extractVersionsFromGithubTagsResponse(response) {
  return _(response).map(function(x) {
    return x.name;
  }).filter(function(x) {
    return /v\d+\.\d+\.\d+/.test(x);
  }).value();
}

function processGithubTagsResponse(lib, response) {
  versions[lib] = extractVersionsFromGithubTagsResponse(response);

  var allVersionsLoaded = _.every(libs, function(lib) {
    return typeof versions[lib] === "object";
  });

  if (allVersionsLoaded) {
    start();
  }
}

function start() {
  lockSelect.removeAttr("disabled");
  lockSelect.on("change", function(event) {
    var lib = event.target.value;
    versionSelect.empty().append(_.map(versions[lib], function(version) {
      return selectOptionString(lib, version);
    }).join(' '));
    if (lib !== currentRelease.lib) {
      if (!localStorage.code) localStorage.code = {};
      if (localStorage.code[lib]) {
        editor.setValue(localStorage.code[lib]);
      } else {
        editor.setValue(startTemplate({}));
      }
    }
    currentRelease.lib = lib;
  });

  versionSelect.removeAttr("disabled");
  versionSelect.on("change", function(event) {
    currentRelease.version = $("option:selected", event.target).data("version");

    var parent = $(previewEl).parent();
    $(previewEl).detach();
    parent.append("<iframe class='js-preview preview'> </iframe>");
    previewEl = $('.js-preview').get(0);
    onChange(editor, true);
  });

  lockSelect.trigger("change");
  versionSelect.trigger("change");
}

function selectOptionString(lib, version) {
  var url = "//cdn.auth0.com/js/" + lib + "-" + version.slice(1) + ".min.js";
  return "<option value='" + url + "' data-version='" + version + "'>" + version + "</option>";
}

_.each(libs, function(lib) {
  // TODO: replace next line once lock-passwordless repo goes public
  // $.getJSON("https://api.github.com/repos/auth0/" + lib + "/tags", function(response) {
  $.getJSON("https://api.github.com/repos/auth0/lock/tags", function(response) {
    // TODO: handle errors
    processGithubTagsResponse(lib, response);
  });
});
