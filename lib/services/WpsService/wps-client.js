'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var xmlTpls = {
    aggregate: require('./wps-xml/aggregate.xml'),
    aggregateWithFilters: require('./wps-xml/aggregateWithFilters.xml'),
    groupBy: require('./wps-xml/group-by.xml'),
    filters: require('./wps-xml/filters.xml')
};

var WpsClient = function () {
    function WpsClient(config) {
        _classCallCheck(this, WpsClient);

        this.config = config;
        this.url = config.geoserverUrl + "/wps/";
    }

    _createClass(WpsClient, [{
        key: 'aggregate',
        value: function aggregate(params) {
            return fetch(this.url, {
                method: 'POST',
                body: this.getXml(xmlTpls.aggregate, params),
                headers: new Headers({
                    'Content-Type': 'text/xml'
                })
            }).then(function (response) {
                return response.json();
            });
        }
    }, {
        key: 'aggregateWithFilters',
        value: function aggregateWithFilters(params) {
            return fetch(this.url, {
                method: 'POST',
                body: this.getXml(xmlTpls.aggregateWithFilters, params),
                headers: new Headers({
                    'Content-Type': 'text/xml'
                })
            }).then(function (response) {
                return response.json();
            });
        }
    }, {
        key: 'getXml',
        value: function getXml(tpl, params) {
            var _this = this;

            var output = tpl;
            Object.keys(params).map(function (key) {
                var val = xmlTpls[key] ? _this.getXml(xmlTpls[key], params[key]) : params[key];
                output = output.replace("__" + key + "__", val);
            });
            //remove template vars that has no value
            output = output.replace(/_{2}\w+_{2}/g, "");
            return output.trim();
        }
    }]);

    return WpsClient;
}();

exports.default = WpsClient;