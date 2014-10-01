var editor = CodeMirror(document.getElementById('editor'), {
  mode: 'javascript',
  lineWrapping: true,
  lineNumbers: JSON.parse(localStorage.lineNumbers || 'false'),
  extraKeys: {"Ctrl-Space": "autocomplete", useGlobalScope: false, globalVars: true},
});

var preview = document.getElementById('preview').contentWindow;
var oldCode;

if (localStorage.text) {
  editor.setValue(localStorage.text);
} else {
  editor.setValue("var domain = 'mdocs.auth0.com';\nvar cid = 'yKJO1ckwuY1X8gPEhTRfhJXyObfiLxih';\n\nvar widget = new Auth0Lock(cid, domain);\n\n\twidget.show({\n\t  focusInput: false,\n      popup: true,\n\t}, function (err, profile, token) {\n\t\talert(err);\n\t});");
}

var errored = false;
function onChange(instance) {
  try {
    var code = instance.getValue();
    var syntax = esprima.parse(code, { tolerant: true, loc: true });
    var errors = syntax.errors;

    if (oldCode === undefined) {
      oldCode = code;
    }

    if(!errors.length) {
      localStorage.text = code;
      var result = esprimaq(syntax).callMethod('widget', 'show').exec();
      console.log(result);
      code = escodegen.generate(syntax);
      if (code === oldCode && !errored) {
        return;
      }
      console.log('here');
      document.getElementById('preview').src = "about:blank";
      //document.getElementById('preview').src = "/empty.html";
      var val = 'document.write("<!DOCTYPE html> <html> <head> <title><\/title>  <script src=\\\"\/\/cdn.auth0.com\/js\/lock-6.min.js\\\"><\/script>  <\/head> <body> <script> " + ' + JSON.stringify(code) + ' + " <\/script><\/body> <\/html>");';
      console.log(val);
      setTimeout(function () { 
        preview.eval(val); 
      });
      oldCode = code;
    } else {
      document.getElementById('preview').src = "about:blank";
      var val = 'document.write("<!DOCTYPE html> <html> <head> <title><\/title> <\/head> <body> <pre> ' + errors.length + ' <\/pre><\/body> <\/html>");';
      console.log('err', val);
      errored = true;
      setTimeout(function () { preview.eval(val); });
    }
  } catch (e) {
    //document.getElementById('preview').src = "/empty.html";
    document.getElementById('preview').src = "about:blank";
    var val = 'document.write("<!DOCTYPE html> <html> <head> <title><\/title> <\/head> <body> <pre> ' + e + ' <\/pre><\/body> <\/html>");';
    console.log('err', val);
    errored = true;
    setTimeout(function () { preview.eval(val); });
    //console.log(e);
    //setTimeout(function () {
    //  preview.eval('document.write("' + e + '");');
    //}, 0);
  }
}

window.addEventListener('load', function () { onChange(editor); } );

editor.on('change', _.debounce(onChange, 500));
