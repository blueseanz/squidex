/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Squidex UG (haftungsbeschränkt). All rights reserved.
 */

import { ChangeDetectorRef, Directive, EmbeddedViewRef, Input, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';

import {
    DialogModel,
    ModalModel,
    Types
} from '@app/framework/internal';

import { RootViewComponent } from './root-view.component';

@Directive({
    selector: '[sqxModalView]'
})
export class ModalViewDirective implements OnChanges, OnDestroy, OnInit {
    private modalSubscription: Subscription | null = null;
    private documentClickCounterListener: Function | null = null;
    private documentClickListener: Function | null = null;
    private renderedView: EmbeddedViewRef<any> | null = null;
    private clickCounter = 0;

    @Input('sqxModalView')
    public modalView: DialogModel | ModalModel | any;

    @Input('sqxModalViewOnRoot')
    public placeOnRoot = false;

    @Input('sqxModalViewCloseAuto')
    public closeAuto = true;

    @Input('sqxModalViewCloseAlways')
    public closeAlways = false;

    constructor(
        private readonly changeDetector: ChangeDetectorRef,
        private readonly renderer: Renderer2,
        private readonly rootView: RootViewComponent,
        private readonly templateRef: TemplateRef<any>,
        private readonly viewContainer: ViewContainerRef
    ) {
    }

    public ngOnDestroy() {
        this.unsubscribeToModal();
        this.unsubscribeToClick();
        this.unsubscribeToCounterClick();

        if (Types.is(this.modalView, DialogModel) || Types.is(this.modalView, ModalModel)) {
            this.modalView.hide();
        }
    }

    public ngOnInit() {
        this.documentClickCounterListener =
            this.renderer.listen('document', 'click', () => {
                this.clickCounter++;
            });
    }

    public ngOnChanges(changes: SimpleChanges) {
        if (!changes['modalView']) {
            return;
        }

        this.unsubscribeToModal();

        if (Types.is(this.modalView, DialogModel) || Types.is(this.modalView, ModalModel)) {
            this.modalSubscription =
                this.modalView.isOpen.subscribe(isOpen => {
                    this.update(isOpen);
                });
        } else {
            this.update(!!this.modalView);
        }
    }

    private update(isOpen: boolean) {
        if (isOpen === (!!this.renderedView)) {
            return;
        }

        this.unsubscribeToClick();

        if (isOpen && !this.renderedView) {
            const container = this.getContainer();

            this.renderedView = container.createEmbeddedView(this.templateRef);

            if (this.renderedView.rootNodes[0].style) {
                this.renderer.setStyle(this.renderedView.rootNodes[0], 'display', 'block');
            }

            this.startListening(this.clickCounter + 1);

            this.changeDetector.detectChanges();
        } else if (!isOpen && this.renderedView) {
            const container = this.getContainer();
            const containerIndex = container.indexOf(this.renderedView);

            container.remove(containerIndex);

            this.renderedView = null;

            this.changeDetector.detectChanges();
        }
    }

    private getContainer() {
        return this.placeOnRoot ? this.rootView.viewContainer : this.viewContainer;
    }

    private startListening(clickCounter: number) {
        if (!this.closeAuto) {
            return;
        }

        this.documentClickListener =
            this.renderer.listen('document', 'click', (event: MouseEvent) => {
                if (!event.target || this.renderedView === null || this.clickCounter === clickCounter) {
                    return;
                }

                if (this.renderedView.rootNodes.length === 0) {
                    return;
                }

                if (this.closeAlways) {
                    this.modalView.hide();
                } else {
                    try {
                        const rootNode = this.renderedView.rootNodes[0];
                        const rootBounds = rootNode.getBoundingClientRect();

                        if (rootBounds.width > 0 && rootBounds.height > 0) {
                            const clickedInside = rootNode.contains(event.target);

                            if (!clickedInside && this.modalView) {
                                this.modalView.hide();
                            }
                        }
                    } catch (ex) {
                        return;
                    }
                }
            });
    }

    private unsubscribeToModal() {
        if (this.modalSubscription) {
            this.modalSubscription.unsubscribe();
            this.modalSubscription = null;
        }
    }

    private unsubscribeToClick() {
        if (this.documentClickListener) {
            this.documentClickListener();
            this.documentClickListener = null;
        }
    }

    private unsubscribeToCounterClick() {
        if (this.documentClickCounterListener) {
            this.documentClickCounterListener();
            this.documentClickCounterListener = null;
        }
    }
}