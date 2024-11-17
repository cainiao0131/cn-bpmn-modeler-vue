import { CreateType, ElementFactoryType, EventType, TranslateType } from '../types';

declare type PaletteType = { registerProvider: (customPalette: CustomPalette) => void };

export default class CustomPalette {
  static $inject: Array<string>;

  create: CreateType;
  elementFactory: ElementFactoryType;
  translate: TranslateType;

  constructor(create: CreateType, elementFactory: ElementFactoryType, palette: PaletteType, translate: TranslateType) {
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    palette.registerProvider(this);
  }

  getPaletteEntries(_) {
    const { create, elementFactory, translate } = this;
    function createServiceTask(event: EventType) {
      const shape = elementFactory.createShape({ type: 'bpmn:ServiceTask' });
      create.start(event, shape);
    }
    return {
      'create.service-task': {
        group: 'activity',
        className: 'bpmn-icon-service-task',
        title: translate('Create ServiceTask'),
        action: {
          dragstart: createServiceTask,
          click: createServiceTask,
        },
      },
    };
  }
}

CustomPalette.$inject = ['create', 'elementFactory', 'palette', 'translate'];
