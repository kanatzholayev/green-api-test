export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'selector-class-pattern': null,
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
    'declaration-block-single-line-max-declarations': null,
    'media-feature-range-notation': 'context',
    'at-rule-empty-line-before': null,
  },
};
