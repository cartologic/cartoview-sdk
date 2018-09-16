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

import { Filter_1_0_0 } from 'ogc-schemas/lib/Filter_1_0_0';
import { GML_2_1_2 } from 'ogc-schemas/lib/GML_2_1_2';
import { Jsonix } from '@boundlessgeo/jsonix';
import { SLD_1_0_0 } from 'ogc-schemas/lib/SLD_1_0_0_GeoServer';
import { XLink_1_0 } from 'w3c-schemas/lib/XLink_1_0';
import util from './utils';

const sldNamespace = 'http://www.opengis.net/sld';
const ogcNamespace = 'http://www.opengis.net/ogc';

var context = new Jsonix.Context([XLink_1_0, Filter_1_0_0, GML_2_1_2, SLD_1_0_0], {
    namespacePrefixes: {
        'http://www.w3.org/1999/xlink': 'xlink',
        'http://www.opengis.net/sld': 'sld',
        'http://www.opengis.net/ogc': 'ogc'
    }
});
var marshaller = context.createMarshaller();
var unmarshaller = context.createUnmarshaller();

const graphicFormats = {
    'image/jpeg': /\.jpe?g$/i,
    'image/gif': /\.gif$/i,
    'image/png': /\.png$/i
};

// make sure <= is on top of < etc.
const comparisonOps = {
    '!=': 'PropertyIsNotEqualTo',
    '==': 'PropertyIsEqualTo',
    '>=': 'PropertyIsGreaterThanOrEqualTo',
    '<=': 'PropertyIsLessThanOrEqualTo',
    '>': 'PropertyIsGreaterThan',
    '<': 'PropertyIsLessThan'
};

class SLDService {
    parse(sld) {
        var result = {};
        var info = unmarshaller.unmarshalString(sld).value;
        var layer = info.namedLayerOrUserLayer[0];
        result.layerName = layer.name;
        var namedStyleOrUserStyle = layer.namedStyleOrUserStyle[0];
        result.styleName = namedStyleOrUserStyle.name;
        result.styleTitle = namedStyleOrUserStyle.title;
        result.featureTypeStyles = [];
        for (var i = 0, ii = namedStyleOrUserStyle.featureTypeStyle.length; i < ii; ++i) {
            var featureTypeStyle = namedStyleOrUserStyle.featureTypeStyle[i];
            var fts = {
                rules: [],
                featureTypeStyleName: featureTypeStyle.name
            };
            for (var j = 0, jj = featureTypeStyle.rule.length; j < jj; ++j) {
                fts.rules.push(this.parseRule(featureTypeStyle.rule[j]));
            }
            result.featureTypeStyles.push(fts);
        }
        return result;
    }
    parseRule(ruleObj) {
        var rule = {};
        rule.name = ruleObj.name;
        rule.title = ruleObj.title;
        rule.minScaleDenominator = ruleObj.minScaleDenominator;
        rule.maxScaleDenominator = ruleObj.maxScaleDenominator;
        rule.symbolizers = [];
        for (var i = 0, ii = ruleObj.symbolizer.length; i < ii; ++i) {
            rule.symbolizers.push(this.parseSymbolizer(ruleObj.symbolizer[i]));
        }
        if (ruleObj.filter) {
            rule.expression = this.filterToExpression(ruleObj.filter);
        }
        return rule;
    }
    parseComparisonOps(op) {
        var name, value, operator;
        for (var key in comparisonOps) {
            if (comparisonOps[key] === op.name.localPart) {
                operator = key;
                break;
            }
        }
        for (var i = 0, ii = op.value.expression.length; i < ii; ++i) {
            var expr = op.value.expression[i];
            if (expr.name.localPart === 'PropertyName') {
                name = expr.value.content[0];
            }
            if (expr.name.localPart === 'Literal') {
                value = expr.value.content[0];
            }
        }
        if (op.name.localPart === 'PropertyIsBetween') {
            name = op.value.expression.value.content[0];
            var lower = op.value.lowerBoundary.expression.value.content[0];
            var upper = op.value.upperBoundary.expression.value.content[0];
            return ['all', ['>=', name, lower], ['<=', name, upper]];
        } else {
            return [operator, name, value];
        }
    }
    parseLogicOps(logicOps) {
        var expressions = [];
        if (logicOps.name.localPart === 'And') {
            expressions.push('all');
        } else if (logicOps.name.localPart === 'Or') {
            expressions.push('any');
        }
        for (var i = 0, ii = logicOps.value.ops.length; i < ii; ++i) {
            var op = logicOps.value.ops[i];
            var subExpressions = this.parseComparisonOps(op);
            if (subExpressions[0] === 'all') {
                return subExpressions;
            } else {
                expressions.push(subExpressions);
            }
        }
        return expressions;
    }
    filterToExpression(filter) {
        if (filter.comparisonOps) {
            return this.parseComparisonOps(filter.comparisonOps);
        } else if (filter.logicOps) {
            return this.parseLogicOps(filter.logicOps);
        }
    }
    parseSymbolizer(symbolizerObj) {
        if (symbolizerObj.name.localPart === 'PolygonSymbolizer') {
            return this.parsePolygonSymbolizer(symbolizerObj.value);
        } else if (symbolizerObj.name.localPart === 'LineSymbolizer') {
            return this.parseLineSymbolizer(symbolizerObj.value);
        } else if (symbolizerObj.name.localPart === 'PointSymbolizer') {
            return this.parsePointSymbolizer(symbolizerObj.value);
        } else if (symbolizerObj.name.localPart === 'TextSymbolizer') {
            return this.parseTextSymbolizer(symbolizerObj.value);
        }
    }
    parseTextSymbolizer(textObj) {
        var result = {};
        var labelInfo = textObj.label.content[0].value;
        if (labelInfo.TYPE_NAME === 'Filter_1_0_0.PropertyNameType') {
            result.labelAttribute = labelInfo.content[0];
        }
        if (textObj.vendorOption) {
            result.vendorOption = textObj.vendorOption;
        }
        if (textObj.labelPlacement) {
            if (textObj.labelPlacement.pointPlacement) {
                var anchorPoint = textObj.labelPlacement.pointPlacement.anchorPoint;
                var displacement = textObj.labelPlacement.pointPlacement.displacement;
                result.labelPlacement = {
                    type: 'POINT'
                };
                if (anchorPoint) {
                    result.labelPlacement.anchorPoint = [anchorPoint.anchorPointX.content[0], anchorPoint.anchorPointY.content[0]];
                }
                if (displacement) {
                    result.labelPlacement.displacement = [displacement.displacementX.content[0], displacement.displacementY.content[0]];
                }
                if (textObj.labelPlacement.pointPlacement.rotation !== undefined) {
                    result.labelPlacement.rotation = textObj.labelPlacement.pointPlacement.rotation.content[0];
                }
            } else if (textObj.labelPlacement.linePlacement) {
                result.labelPlacement = {
                    type: 'LINE'
                };
            }
        }
        if (textObj.font && textObj.font.cssParameter) {
            for (var i = 0, ii = textObj.font.cssParameter.length; i < ii; ++i) {
                var param = textObj.font.cssParameter[i];
                if (param.name === 'font-size') {
                    result.fontSize = param.content[0];
                } else if (param.name === 'font-family') {
                    result.fontFamily = param.content[0];
                } else if (param.name === 'font-style') {
                    result.fontStyle = param.content[0];
                } else if (param.name === 'font-weight') {
                    result.fontWeight = param.content[0];
                }
            }
        }
        if (textObj.fill) {
            result.fontColor = this.parseFill(textObj.fill).fillColor;
        }
        if (textObj.halo) {
            result.halo = {
                fill: this.parseFill(textObj.halo.fill).fillColor,
                radius: textObj.halo.radius.content[0]
            };
        }
        return result;
    }
    _parseGraphic(graphic) {
        var result = {};
        if (graphic.opacity) {
            result.opacity = parseFloat(graphic.opacity.content[0]);
        }
        if (graphic.rotation) {
            result.rotation = graphic.rotation.content[0];
        }
        if (graphic.size) {
            result.symbolSize = graphic.size.content[0];
        }
        var externalGraphicOrMark = graphic.externalGraphicOrMark[0];
        if (externalGraphicOrMark.TYPE_NAME === 'SLD_1_0_0.ExternalGraphic') {
            result.externalGraphic = externalGraphicOrMark.onlineResource.href;
        } else {
            if (externalGraphicOrMark.wellKnownName) {
                result.symbolType = externalGraphicOrMark.wellKnownName.content[0];
            }
            var fill = externalGraphicOrMark.fill;
            if (fill) {
                result.fillColor = this.parseFill(fill).fillColor;
            } else {
                result.hasFill = false;
            }
            var stroke = externalGraphicOrMark.stroke;
            if (stroke) {
                Object.assign(result, this.parseStroke(stroke));
            } else {
                result.hasStroke = false;
            }
        }
        return result;
    }
    parsePointSymbolizer(pointObj) {
        var result = this._parseGraphic(pointObj.graphic);
        result.type = 'Point';
        return result;
    }
    parseLineSymbolizer(lineObj) {
        var result = this.parseStroke(lineObj.stroke);
        result.type = 'LineString';
        return result;
    }
    parsePolygonSymbolizer(polyObj) {
        var result = {
            type: 'Polygon'
        };
        if (polyObj.fill) {
            var fill = this.parseFill(polyObj.fill);
            if (fill.fillColor) {
                result.fillColor = fill.fillColor;
            } else if (fill.graphicFill) {
                result.graphicFill = fill.graphicFill;
            }
        } else {
            result.hasFill = false;
        }
        if (polyObj.stroke) {
            Object.assign(result, this.parseStroke(polyObj.stroke));
        } else {
            result.hasStroke = false;
        }
        return result;
    }
    parseFill(fillObj) {
        if (fillObj.graphicFill) {
            return {
                graphicFill: this._parseGraphic(fillObj.graphicFill.graphic)
            };
        } else {
            var fillColor = {};
            for (var i = 0, ii = fillObj.cssParameter.length; i < ii; ++i) {
                if (fillObj.cssParameter[i].name === 'fill') {
                    fillColor.hex = fillObj.cssParameter[i].content[0];
                    fillColor.rgb = util.hexToRgb(fillColor.hex);
                } else if (fillObj.cssParameter[i].name === 'fill-opacity') {
                    fillColor.rgb = Object.assign(fillColor.rgb, { a: parseFloat(fillObj.cssParameter[i].content[0]) });
                }
            }
            return {
                fillColor: fillColor
            };
        }
    }
    parseStroke(strokeObj) {
        var stroke = {};
        if (strokeObj.cssParameter) {
            for (var i = 0, ii = strokeObj.cssParameter.length; i < ii; ++i) {
                if (strokeObj.cssParameter[i].name === 'stroke') {
                    stroke.strokeColor = {
                        hex: strokeObj.cssParameter[i].content[0],
                        rgb: util.hexToRgb(strokeObj.cssParameter[i].content[0])
                    };
                } else if (strokeObj.cssParameter[i].name === 'stroke-opacity') {
                    stroke.strokeColor.rgb = Object.assign(stroke.strokeColor.rgb, { a: parseFloat(strokeObj.cssParameter[i].content[0]) });
                } else if (strokeObj.cssParameter[i].name === 'stroke-width') {
                    stroke.strokeWidth = parseFloat(strokeObj.cssParameter[i].content[0]);
                } else if (strokeObj.cssParameter[i].name === 'stroke-dasharray') {
                    stroke.strokeDashArray = strokeObj.cssParameter[i].content[0];
                } else if (strokeObj.cssParameter[i].name === 'stroke-dashoffset') {
                    stroke.strokeDashOffset = strokeObj.cssParameter[i].content[0];
                } else if (strokeObj.cssParameter[i].name === 'stroke-linecap') {
                    stroke.strokeLineCap = strokeObj.cssParameter[i].content[0];
                }
            }
        }
        if (strokeObj.graphicStroke) {
            stroke.graphic = this._parseGraphic(strokeObj.graphicStroke.graphic);
        }
        return stroke;
    }
    createFill(styleState) {
        if (styleState.graphicFill) {
            return {
                graphicFill: {
                    graphic: this._createGraphic(styleState.graphicFill)
                }
            };
        } else {
            var cssParameter = [{
                name: 'fill',
                content: [styleState.fillColor.hex]
            }];
            if (styleState.fillColor.rgb.a !== undefined) {
                cssParameter.push({
                    name: 'fill-opacity',
                    content: [String(styleState.fillColor.rgb.a)]
                });
            }
            return {
                cssParameter: cssParameter
            };
        }
    }
    createStroke(styleState) {
        var graphic;
        if (styleState.graphic) {
            graphic = this._createGraphic(styleState.graphic);
        }
        var cssParameters = [];
        if (styleState.strokeColor) {
            cssParameters.push({
                name: 'stroke',
                content: [styleState.strokeColor.hex]
            });
            if (styleState.strokeColor.rgb.a !== undefined) {
                cssParameters.push({
                    name: 'stroke-opacity',
                    content: [String(styleState.strokeColor.rgb.a)]
                });
            }
        }
        if (styleState.strokeWidth !== undefined) {
            cssParameters.push({
                name: 'stroke-width',
                content: [String(styleState.strokeWidth)]
            });
        }
        if (styleState.strokeDashArray !== undefined) {
            cssParameters.push({
                name: 'stroke-dasharray',
                content: [styleState.strokeDashArray]
            });
        }
        if (styleState.strokeDashOffset !== undefined) {
            cssParameters.push({
                name: 'stroke-dashoffset',
                content: [styleState.strokeDashOffset]
            });
        }
        if (styleState.strokeLineCap !== undefined) {
            cssParameters.push({
                name: 'stroke-linecap',
                content: [styleState.strokeLineCap]
            });
        }
        var result;
        if (cssParameters.length > 0 || graphic) {
            result = {};
            if (cssParameters.length > 0) {
                result.cssParameter = cssParameters;
            }
            if (graphic) {
                result.graphicStroke = {
                    graphic: graphic
                };
            }
        }
        return result;
    }
    createPolygonSymbolizer(styleState) {
        var result = {
            name: {
                localPart: 'PolygonSymbolizer',
                namespaceURI: sldNamespace
            },
            value: {
                fill: (styleState.fillColor || styleState.graphicFill) && styleState.hasFill !== false ? this.createFill(styleState) : undefined,
                stroke: styleState.hasStroke !== false ? this.createStroke(styleState) : undefined
            }
        };
        if (result.value.fill || result.value.stroke) {
            return result;
        } else {
            return undefined;
        }
    }
    createLineSymbolizer(styleState) {
        var stroke = this.createStroke(styleState);
        if (stroke) {
            return {
                name: {
                    localPart: 'LineSymbolizer',
                    namespaceURI: sldNamespace
                },
                value: {
                    stroke: stroke
                }
            };
        } else {
            return undefined;
        }
    }
    _getGraphicFormat(href) {
        var format;
        for (var key in graphicFormats) {
            if (graphicFormats[key].test(href)) {
                format = key;
                break;
            }
        }
        return format || 'image/png';
    }
    _createGraphic(styleState) {
        var graphicOrMark;
        if (styleState.externalGraphic) {
            graphicOrMark = [{
                TYPE_NAME: 'SLD_1_0_0.ExternalGraphic',
                onlineResource: { href: styleState.externalGraphic },
                format: this._getGraphicFormat(styleState.externalGraphic)
            }];
        } else if (styleState.symbolType) {
            graphicOrMark = [{
                TYPE_NAME: 'SLD_1_0_0.Mark',
                fill: styleState.hasFill !== false && styleState.fillColor ? this.createFill(styleState) : undefined,
                stroke: styleState.hasStroke !== false ? this.createStroke(styleState) : undefined,
                wellKnownName: [styleState.symbolType]
            }];
        } else {
            return undefined;
        }
        var result = {
            externalGraphicOrMark: graphicOrMark,
            size: {
                content: [styleState.symbolSize]
            }
        };
        if (styleState.rotation !== undefined) {
            result.rotation = [styleState.rotation];
        }
        if (styleState.externalGraphic && styleState.opacity !== undefined) {
            result.opacity = {
                content: ['' + styleState.opacity]
            };
        }
        return result;
    }
    createPointSymbolizer(styleState) {
        var graphic = this._createGraphic(styleState);
        if (graphic) {
            return {
                name: {
                    localPart: 'PointSymbolizer',
                    namespaceURI: sldNamespace
                },
                value: {
                    graphic: graphic
                }
            };
        } else {
            return undefined;
        }
    }
    createTextSymbolizer(styleState) {
        var cssParameter = [];
        if (styleState.fontFamily) {
            cssParameter.push({
                name: 'font-family',
                content: [styleState.fontFamily]
            });
        }
        if (styleState.fontSize) {
            cssParameter.push({
                name: 'font-size',
                content: [String(styleState.fontSize)]
            });
        }
        if (styleState.fontStyle) {
            cssParameter.push({
                name: 'font-style',
                content: [styleState.fontStyle]
            });
        }
        if (styleState.fontWeight) {
            cssParameter.push({
                name: 'font-weight',
                content: [styleState.fontWeight]
            });
        }
        var result = {
            name: {
                localPart: 'TextSymbolizer',
                namespaceURI: sldNamespace
            },
            value: {
                fill: styleState.fontColor ? {
                    cssParameter: [{
                        name: 'fill',
                        content: [styleState.fontColor.hex]
                    }]
                } : undefined,
                font: cssParameter.length > 0 ? {
                    cssParameter: cssParameter
                } : undefined,
                label: {
                    content: [{
                        name: {
                            localPart: 'PropertyName',
                            namespaceURI: ogcNamespace
                        },
                        value: {
                            content: [styleState.labelAttribute]
                        }
                    }]
                },
                vendorOption: styleState.vendorOption
            }
        };
        if (styleState.halo) {
            result.value.halo = {
                fill: {
                    cssParameter: [{
                        name: 'fill',
                        content: [styleState.halo.fill.hex]
                    }]
                },
                radius: {
                    content: [styleState.halo.radius]
                }
            };
        }
        if (styleState.labelPlacement) {
            if (styleState.labelPlacement.type === 'POINT') {
                result.value.labelPlacement = {
                    pointPlacement: {
                        anchorPoint: {
                            anchorPointX: {
                                content: [String(styleState.labelPlacement.anchorPoint[0])]
                            },
                            anchorPointY: {
                                content: [String(styleState.labelPlacement.anchorPoint[1])]
                            }
                        }
                    }
                };
                if (styleState.labelPlacement.displacement) {
                    result.value.labelPlacement.pointPlacement.displacement = {
                        displacementX: {
                            content: [String(styleState.labelPlacement.displacement[0])]
                        },
                        displacementY: {
                            content: [String(styleState.labelPlacement.displacement[1])]
                        }
                    };
                }
                if (styleState.labelPlacement.rotation !== undefined) {
                    result.value.labelPlacement.pointPlacement.rotation = {
                        content: [String(styleState.labelPlacement.rotation)]
                    };
                }
            } else if (styleState.labelPlacement.type === 'LINE') {
                result.value.labelPlacement = {
                    linePlacement: {}
                };
            }
        }
        return result;
    }
    expressionToFilter(expression) {
        if (expression[0] === 'all' || expression[0] === 'any') {
            var result = {
                logicOps: {
                    name: {
                        namespaceURI: ogcNamespace,
                        localPart: expression[0] === 'all' ? 'And' : 'Or'
                    },
                    value: {
                        ops: []
                    }
                }
            };
            for (var i = 1, ii = expression.length; i < ii; ++i) {
                result.logicOps.value.ops.push(this.expressionToComparisonOp(expression[i]).comparisonOps);
            }
            return result;
        } else {
            return this.expressionToComparisonOp(expression);
        }
    }
    expressionToComparisonOp(expression) {
        var operator, property, value;
        operator = comparisonOps[expression[0]];
        property = expression[1];
        value = expression[2];
        if (operator) {
            var result = {
                comparisonOps: {
                    name: {
                        namespaceURI: ogcNamespace,
                        localPart: operator
                    }
                }
            };
            // TODO add back PropertyIsBetween
            result.comparisonOps.value = {
                expression: [{
                    name: {
                        namespaceURI: ogcNamespace,
                        localPart: 'PropertyName'
                    },
                    value: {
                        content: [property]
                    }
                }, {
                    name: {
                        namespaceURI: ogcNamespace,
                        localPart: 'Literal'
                    },
                    value: {
                        content: [String(value)]
                    }
                }]
            };
            return result;
        }
    }
    createRule(name, title, geometryType, styleState) {
        var filter;
        if (styleState.expression) {
            filter = this.expressionToFilter(styleState.expression);
        }
        var symbolizer = [], i, ii, sym;
        var functionByGeomType = {
            'Point': this.createPointSymbolizer,
            'LineString': this.createLineSymbolizer,
            'Polygon': this.createPolygonSymbolizer
        };
        if (geometryType !== undefined) {
            for (i = 0, ii = styleState.symbolizers.length; i < ii; ++i) {
                sym = functionByGeomType[geometryType].call(this, styleState.symbolizers[i]);
                if (sym) {
                    symbolizer.push(sym);
                }
            }
        } else {
            for (i = 0, ii = styleState.symbolizers.length; i < ii; ++i) {
                var symbol = styleState.symbolizers[i];
                if (symbol.type) {
                    sym = functionByGeomType[symbol.type].call(this, styleState.symbolizers[i]);
                    if (sym) {
                        symbolizer.push(sym);
                    }
                }
            }
        }
        for (i = 0, ii = styleState.symbolizers.length; i < ii; ++i) {
            if (styleState.symbolizers[i].labelAttribute) {
                symbolizer.push(this.createTextSymbolizer(styleState.symbolizers[i]));
            }
        }
        return {
            name: name,
            title: title,
            symbolizer: symbolizer,
            minScaleDenominator: styleState.minScaleDenominator,
            maxScaleDenominator: styleState.maxScaleDenominator,
            filter: filter
        };
    }
    createSLD(layer, geometryType, featureTypeStyles) {
        var layerName = layer.get('name');
        var styleInfo = layer.get('styleInfo');
        var result = {
            name: {
                namespaceURI: sldNamespace,
                localPart: 'StyledLayerDescriptor'
            }
        };
        result.value = {
            version: '1.0.0',
            namedLayerOrUserLayer: [{
                TYPE_NAME: 'SLD_1_0_0.NamedLayer',
                name: layerName,
                namedStyleOrUserStyle: [{
                    TYPE_NAME: 'SLD_1_0_0.UserStyle',
                    name: styleInfo ? styleInfo.styleName : undefined,
                    title: styleInfo ? styleInfo.styleTitle : undefined,
                    featureTypeStyle: []
                }]
            }]
        };
        for (var i = 0, ii = featureTypeStyles.length; i < ii; ++i) {
            var ruleContainer = [];
            result.value.namedLayerOrUserLayer[0].namedStyleOrUserStyle[0].featureTypeStyle.push({
                name: featureTypeStyles[i].featureTypeStyleName,
                rule: ruleContainer
            });
            for (var j = 0, jj = featureTypeStyles[i].rules.length; j < jj; ++j) {
                var rule = featureTypeStyles[i].rules[j].name;
                var style = featureTypeStyles[i].rules[j];
                ruleContainer.push(this.createRule(rule, style.title, geometryType, style));
            }
        }
        return marshaller.marshalString(result);
    }
}

export default new SLDService();