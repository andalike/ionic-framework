import { defineComponent, h, ref, VNode } from 'vue';

export interface OverlayProps {
  isOpen?: boolean;
}

export const defineOverlayContainer = <Props extends object>(name: string, componentProps: string[] = [], controller: any) => {
  // TODO
  const eventPrefix = name.toLowerCase().split('-').join('');
  const eventListeners = [
    { componentEv: `${eventPrefix}willpresent`, frameworkEv: 'onWillPresent' },
    { componentEv: `${eventPrefix}didpresent`, frameworkEv: 'onDidPresent' },
    { componentEv: `${eventPrefix}willdismiss`, frameworkEv: 'onWillDismiss' },
    { componentEv: `${eventPrefix}diddismiss`, frameworkEv: 'onDidDismiss' },
  ];

  const Container = defineComponent<Props & OverlayProps>((props, { slots, emit }) => {
    const overlay = ref();
    let isOpening = false;
    let isDismissing = false;
    const onVnodeMounted = async () => {
      const isOpen = props.isOpen;
      isOpen && (await present(props))
    }

    const onVnodeUpdated = async (node: VNode, prevNode: VNode) => {
      const isOpen = node.props!.isOpen;
      const prevIsOpen = prevNode.props!.isOpen;

      /**
       * If overlay is opening/closing, then we should not
       * open a new instance otherwise the old overlay
       * element would be orphaned.
       */
      if (isOpen === prevIsOpen || isOpening || isDismissing) return;

      if (isOpen) {
        isOpening = true;
        await (overlay.value?.present() || present(props));
        isOpening = false;
      } else {
        isDismissing = true;
        await overlay.value?.dismiss();
        overlay.value = undefined;
        isDismissing = false;
      }
    }

    const onVnodeBeforeUnmount = async () => {
      await overlay.value?.dismiss();
      overlay.value = undefined;
    }

    const present = async (props: Readonly<Props>) => {
      const component = slots.default && slots.default()[0];
      overlay.value = await controller.create({
        ...props,
        component
      });

      eventListeners.forEach(eventListener => {
        overlay.value.addEventListener(eventListener.componentEv, () => {
          emit(eventListener.frameworkEv);
        });
      })

      await overlay.value.present();
    }

    return () => {
      return h(
        'div',
        {
          style: { display: 'none' },
          onVnodeMounted,
          onVnodeUpdated,
          onVnodeBeforeUnmount,
          isOpen: props.isOpen
        }
      );
    }
  });

  Container.displayName = name;
  Container.props = [...componentProps, 'isOpen'];
  Container.emits = eventListeners.map(ev => ev.frameworkEv);

  return Container;
}
