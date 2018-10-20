
/*
 * Copyright 2015-present Boundless Spatial Inc., http://boundlessgeo.com
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { layers, sources } from './MapConfigService'

import GeoJSON from 'ol/format/geojson'
import SLDService from './SLDService';
import URL from 'url-parse';
import WMSCapabilities from 'ol/format/wmscapabilities'
import WMSGetFeatureInfo from 'ol/format/wmsgetfeatureinfo'
import util from './utils';

const wmsCapsFormat = new WMSCapabilities();
const wmsGetFeatureInfoFormats = {
    'application/json': new GeoJSON(),
    'application/vnd.ogc.gml': new WMSGetFeatureInfo()
};

class WMSService {
    getCapabilitiesUrl(url, opt_proxy) {
        var urlObj = new URL(url, true);
        urlObj.set('query', Object.assign(urlObj.query, {
            service: 'WMS',
            request: 'GetCapabilities',
            version: '1.3.0'
        }));
        return util.getProxiedUrl(urlObj.toString(), opt_proxy);
    }
    _getGetMapUrl(info) {
        var dcp = info.Capability.Request.GetMap.DCPType;
        for (var i = 0, ii = dcp.length; i < ii; ++i) {
            if (dcp[i].HTTP && dcp[i].HTTP.Get) {
                return dcp[i].HTTP.Get.OnlineResource;
            }
        }
    }
    getCapabilities(url, onSuccess, onFailure, opt_proxy, opt_requestHeaders) {
        return util.doGET(this.getCapabilitiesUrl(url, opt_proxy), function (xmlhttp) {
            var info = wmsCapsFormat.read(xmlhttp.responseText);
            onSuccess.call(this, info.Capability.Layer, this._getGetMapUrl(info));
        }, function (xmlhttp) {
            onFailure.call(this, xmlhttp);
        }, this, opt_requestHeaders);
    }
    createLayerFromGetCaps(url, layerName, projection, callback, opt_proxy) {
        this.getCapabilities(url, function (layerInfo, getMapUrl) {
            for (var i = 0, ii = layerInfo.Layer.length; i < ii; ++i) {
                if (layerInfo.Layer[i].Name === layerName) {
                    return callback.call(this, this.createLayer(layerInfo.Layer[i], getMapUrl || url, { title: layerInfo.Layer[i].Title }, projection, opt_proxy));
                }
            }
        }, function () { }, opt_proxy);
    }
    createLayer(layer, url, titleObj, projection, opt_proxy) {
        var getLegendUrl = function (layer) {
            if (layer.Style && layer.Style.length === 1) {
                if (layer.Style[0].LegendURL && layer.Style[0].LegendURL.length >= 1) {
                    return layer.Style[0].LegendURL[0].OnlineResource;
                }
            }
        };
        var units = projection.getUnits();
        var source = new sources["TileWMS"]({
            url: url,
            wrapX: layer.Layer ? true : false,
            crossOrigin: 'anonymous',
            params: {
                LAYERS: layer.Name,
                TILED: true
            }
        });
        if (opt_proxy) {
            source.once('tileloaderror', function () {
                source.setTileLoadFunction((function () {
                    var tileLoadFn = source.getTileLoadFunction();
                    return function (tile, src) {
                        tileLoadFn(tile, util.getProxiedUrl(src, opt_proxy));
                    };
                })());
            });
        }
        return new layers["Tile"]({
            title: titleObj.title,
            emptyTitle: titleObj.empty,
            id: layer.Name,
            name: layer.Name,
            legendUrl: getLegendUrl(layer),
            minResolution: layer.MinScaleDenominator > 0 ? util.getResolutionForScale(layer.MinScaleDenominator, units) : undefined,
            maxResolution: layer.MaxScaleDenominator > 0 ? util.getResolutionForScale(layer.MaxScaleDenominator, units) : undefined,
            isRemovable: true,
            isSelectable: true,
            isWFST: true,
            timeInfo: util.getTimeInfo(layer),
            type: layer.Layer ? 'base' : undefined,
            EX_GeographicBoundingBox: layer.EX_GeographicBoundingBox,
            popupInfo: '#AllAttributes',
            source: source
        });
    }
    getStylesUrl(url, layer, opt_proxy) {
        var urlObj = new URL(url);
        urlObj.set('query', {
            service: 'WMS',
            request: 'GetStyles',
            layers: layer.get('name'),
            version: '1.1.1'
        });
        return util.getProxiedUrl(urlObj.toString(), opt_proxy);
    }
    getStyles(url, layer, onSuccess, onFailure, opt_proxy, opt_requestHeaders) {
        return util.doGET(this.getStylesUrl(url, layer, opt_proxy), function (xmlhttp) {
            var info = SLDService.parse(xmlhttp.responseText);
            onSuccess.call(this, info);
        }, function (xmlhttp) {
            onFailure.call(this, xmlhttp);
        }, this, opt_requestHeaders);
    }
    getFeatureInfoUrl(layer, coordinate, view, infoFormat, opt_proxy) {
        var resolution = view.getResolution(), projection = view.getProjection();
        var url = layer.getSource().getGetFeatureInfoUrl(
            coordinate,
            resolution,
            projection, {
                'INFO_FORMAT': infoFormat
            }
        );
        return util.getProxiedUrl(url, opt_proxy);
    }
    getFeatureInfo(layer, coordinate, map, infoFormat, onSuccess, onFailure, opt_proxy, opt_requestHeaders) {
        var view = map.getView();
        util.doGET(this.getFeatureInfoUrl(layer, coordinate, view, infoFormat, opt_proxy), function (response) {
            var result = {};
            if (infoFormat === 'text/plain' || infoFormat === 'text/html') {
                if (response.responseText.trim() !== 'no features were found') {
                    result.text = response.responseText;
                } else {
                    result = false;
                }
            } else {
                result.features = wmsGetFeatureInfoFormats[infoFormat].readFeatures(response.responseText);
            }
            result.layer = layer;
            onSuccess.call(this, result);
        }, onFailure, this, opt_requestHeaders);
    }
}

export default new WMSService();