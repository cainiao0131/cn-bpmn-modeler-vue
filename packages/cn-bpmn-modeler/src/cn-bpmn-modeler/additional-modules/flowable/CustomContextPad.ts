import { CreateType, ElementFactoryType, ElementType, EventType, ShapeType, TranslateType } from '../types';

declare type InjectorType = { get: (a: string, b: boolean) => AutoPlaceType };
declare type ContextPadType = { registerProvider: (pad: CustomContextPad) => void };
declare type AutoPlaceType = { append: (element: ElementType, shape: ShapeType) => void };

export default class CustomContextPad {
  static $inject: Array<string>;

  create: CreateType;
  elementFactory: ElementFactoryType;
  translate: TranslateType;
  autoPlace?: AutoPlaceType;

  constructor(
    config: { autoPlace: boolean },
    contextPad: ContextPadType,
    create: CreateType,
    elementFactory: ElementFactoryType,
    injector: InjectorType,
    translate: TranslateType,
  ) {
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    if (config.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }
    contextPad.registerProvider(this);
  }

  getContextPadEntries(element: ElementType) {
    const { autoPlace, create, elementFactory, translate } = this;
    function appendServiceTask(event: EventType, element: ElementType) {
      if (autoPlace) {
        const shape = elementFactory.createShape({ type: 'bpmn:ServiceTask' });
        autoPlace.append(element, shape);
      } else {
        appendServiceTaskStart(event);
      }
    }
    function appendServiceTaskStart(event: EventType) {
      const shape = elementFactory.createShape({ type: 'bpmn:ServiceTask' });
      create.start(event, shape, element);
    }
    return {
      'append.service-task': {
        group: 'model',
        className: 'bpmn-icon-service-task',
        title: translate('Append ServiceTask'),
        action: {
          click: appendServiceTask,
          dragstart: appendServiceTaskStart,
        },
      },
    };
  }
}

CustomContextPad.$inject = ['config', 'contextPad', 'create', 'elementFactory', 'injector', 'translate'];
