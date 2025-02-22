define([
    '/common/common-util.js',
    '/customize/messages.js'
], function (Util, Messages) {
    var Export = {};

    var escapeCSV = function (v) {
        if (!/("|,|\n|;)/.test(v)) {
            return v || '';
        }
        var value = '';
        var vv = (v || '').replaceAll('"', '""');
        value += '"' + vv + '"';
        return value;
    };

    var exportJSON = function (content, answers, TYPES, order) {
        var form = content.form;
        var res = {
            questions: {},
            responses: []
        };
        var q = res.questions;
        var r = res.responses;

        // Add questions
        var i = 1;
        order.forEach(function (key) {
            var obj = form[key];
            if (!obj) { return; }
            var type = obj.type;
            if (!TYPES[type]) { return; } // Ignore static types
            var id = `q${i++}`;
            if (TYPES[type] && TYPES[type].exportCSV) {
                var _obj = Util.clone(obj);
                _obj.q = "tmp";
                q[id] = {
                    question: obj.q,
                    items: TYPES[type].exportCSV(false, _obj).map(function (str) {
                        return str.slice(6); // Remove "tmp | "
                    })
                };
            } else {
                q[id] = obj.q || Messages.form_default;
            }
        });

        Object.keys(answers || {}).forEach(function (key) {
            var userObj = answers[key];
            Object.keys(userObj).forEach(function (k) {
                var obj = userObj[k];
                var time = new Date(obj.time).toISOString();
                var msg = obj.msg || {};
                var user = msg._userdata || {};
                var data = {
                    '_time': time,
                    '_name': user.name || Messages.anonymous
                };

                var i = 1;
                order.forEach(function (key) {
                    if (!form[key]) { return; }
                    var type = form[key].type;
                    if (!TYPES[type]) { return; } // Ignore static types
                    var id = `q${i++}`;
                    if (TYPES[type].exportCSV) {
                        data[id] = TYPES[type].exportCSV(msg[key], form[key]);
                        return;
                    }
                    data[id] = msg[key];
                });
                r.push(data);
            });
        });

        return JSON.stringify(res, 0, 2);
    };
    Export.results = function (content, answers, TYPES, order, format) {
        if (!content || !content.form) { return; }

        if (format === "json") { return exportJSON(content, answers, TYPES, order); }

        var isArray = format === "array";
        var csv = "";
        var array = [];
        var form = content.form;

        var questions = [Messages.form_poll_time, Messages.share_formView];

        order.forEach(function (key) {
            var obj = form[key];
            if (!obj) { return; }
            var type = obj.type;
            if (!TYPES[type]) { return; } // Ignore static types
            var c;
            if (TYPES[type] && TYPES[type].exportCSV) { c = TYPES[type].exportCSV(false, obj); }
            if (!c) { c = [obj.q || Messages.form_default]; }
            Array.prototype.push.apply(questions, c);
        });

        questions.forEach(function (v, i) {
            if (i) { csv += ','; }
            csv += escapeCSV(v);
        });
        array.push(questions);

        Object.keys(answers || {}).forEach(function (key) {
            var _obj = answers[key];
            Object.keys(_obj).forEach(function (uid) {
                var obj = _obj[uid];
                csv += '\n';
                var time = new Date(obj.time).toISOString();
                var msg = obj.msg || {};
                var user = msg._userdata || {};
                var line = [];
                line.push(time);
                line.push(user.name || Messages.anonymous);
                order.forEach(function (key) {
                    var type = form[key].type;
                    if (!TYPES[type]) { return; } // Ignore static types
                    if (TYPES[type].exportCSV) {
                        var res = TYPES[type].exportCSV(msg[key], form[key]);
                        Array.prototype.push.apply(line, res);
                        return;
                    }
                    line.push(String(msg[key] || ''));
                });
                line.forEach(function (v, i) {
                    if (i) { csv += ','; }
                    csv += escapeCSV(v);
                });
                array.push(line);
            });
        });
        if (isArray) { return array; }
        return csv;
    };

    Export.main = function (content, cb) {
        var json = Util.clone(content || {});
        delete json.answers;
        cb(new Blob([JSON.stringify(json, 0, 2)], {
            type: 'application/json;charset=utf-8'
        }));
    };

    return Export;
});
