"use client";

import type { CSSProperties } from "react";
import {
  MopiensMenuBar,
  MopiensNavigation,
  MopiensOutputPane,
  MopiensStatusBar,
  MopiensTabHost,
  MopiensTitleBar,
  MopiensToolbar,
} from "./chrome";
import { MopiensDesktopViewport } from "./desktop-viewport";
import type { MopiensPmdtShellProps } from "./types";
import styles from "./mopiens-pmdt.module.css";

export function MopiensPmdtShell({
  ariaLabel,
  title,
  brandLabel,
  connection,
  user,
  menus,
  toolbarActions,
  navigationTitle,
  navigationSections,
  activeNavigationSectionId,
  activeNavigationItemId,
  tabs,
  activeTabId,
  children,
  output,
  outputTitle,
  outputFilters,
  activeOutputFilterId,
  outputEmptyLabel,
  statusItems,
  designWidth = 1024,
  designHeight = 768,
  minimumScale,
  outputHeight = 172,
  onMenuCommand,
  onToolbarAction,
  onNavigationSectionChange,
  onNavigationItemSelect,
  onTabChange,
  onTabClose,
  onOutputFilterChange,
  onOutputClear,
  onMinimize,
  onMaximize,
  onClose,
}: MopiensPmdtShellProps) {
  const hasOutput = output !== undefined;
  const shellStyle = {
    "--mopiens-output-height": `${outputHeight}px`,
  } as CSSProperties;

  return (
    <MopiensDesktopViewport
      aria-label={ariaLabel}
      designWidth={designWidth}
      designHeight={designHeight}
      minimumScale={minimumScale}
    >
      <article className={styles.pmdtWindow} style={shellStyle}>
        <MopiensTitleBar
          title={title}
          brandLabel={brandLabel}
          connection={connection}
          user={user}
          onMinimize={onMinimize}
          onMaximize={onMaximize}
          onClose={onClose}
        />
        <MopiensMenuBar menus={menus} onCommand={onMenuCommand} />
        <MopiensToolbar actions={toolbarActions} onAction={onToolbarAction} />

        <div className={styles.pmdtWorkspace}>
          <MopiensNavigation
            title={navigationTitle}
            sections={navigationSections}
            activeSectionId={activeNavigationSectionId}
            activeItemId={activeNavigationItemId}
            onSectionChange={onNavigationSectionChange}
            onItemSelect={onNavigationItemSelect}
          />

          <div
            className={`${styles.pmdtContent} ${
              hasOutput ? "" : styles.pmdtContentWithoutOutput
            }`}
          >
            <MopiensTabHost
              tabs={tabs}
              activeTabId={activeTabId}
              onTabChange={onTabChange}
              onTabClose={onTabClose}
            >
              <main className={styles.pmdtMain}>{children}</main>
            </MopiensTabHost>
            {hasOutput ? (
              <MopiensOutputPane
                title={outputTitle}
                filters={outputFilters}
                activeFilterId={activeOutputFilterId}
                onFilterChange={onOutputFilterChange}
                onClear={onOutputClear}
                emptyLabel={outputEmptyLabel}
              >
                {output}
              </MopiensOutputPane>
            ) : null}
          </div>
        </div>

        <MopiensStatusBar items={statusItems} />
      </article>
    </MopiensDesktopViewport>
  );
}
