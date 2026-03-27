/**
 * Cleanse Report – collapsible operation tree
 *
 * Each tree node is rendered as a flat list of `.app-tree-node` elements
 * with `data-depth` and `data-has-children` attributes.  Parent nodes
 * get a toggle button that collapses / expands their descendants.
 */

function initOperationTree() {
  const nodes = /** @type {HTMLElement[]} */ ([
    ...document.querySelectorAll('.app-tree-node[data-depth]')
  ])

  if (!nodes.length) return

  // Expand-all / Collapse-all controls
  const toolbar = document.querySelector('.app-tree-toolbar')
  if (toolbar) {
    toolbar
      .querySelector('[data-action="expand-all"]')
      ?.addEventListener('click', () => setAll(true))
    toolbar
      .querySelector('[data-action="collapse-all"]')
      ?.addEventListener('click', () => setAll(false))
  }

  // Attach a toggle button to every parent node
  for (const node of nodes) {
    if (node.dataset.hasChildren !== 'true') continue

    const heading = node.querySelector('.app-tree-node__heading')
    if (!heading) continue

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'app-tree-toggle'
    btn.setAttribute('aria-expanded', 'true')
    btn.innerHTML =
      '<span class="app-tree-toggle__icon" aria-hidden="true"></span>' +
      '<span class="govuk-visually-hidden">Toggle children</span>'
    heading.prepend(btn)

    btn.addEventListener('click', () => {
      const expanding = btn.getAttribute('aria-expanded') !== 'true'
      btn.setAttribute('aria-expanded', String(expanding))
      toggleDescendants(node, nodes, expanding)
    })
  }

  /**
   * Show or hide every descendant of `parentNode` in the flat list.
   * Respects intermediate collapsed parents – if a collapsed parent is
   * inside a section being expanded, its children stay hidden.
   */
  function toggleDescendants(parentNode, allNodes, show) {
    const parentIdx = allNodes.indexOf(parentNode)
    const parentDepth = Number(parentNode.dataset.depth)

    // Track collapsed ancestors so we don't reveal nodes inside
    // a separately-collapsed sub-tree when expanding.
    const collapsedAncestors = new Set()

    for (let i = parentIdx + 1; i < allNodes.length; i++) {
      const child = allNodes[i]
      const childDepth = Number(child.dataset.depth)

      if (childDepth <= parentDepth) break // back to sibling or above

      if (show) {
        // Check if any ancestor between parent and this node is collapsed
        let hiddenByAncestor = false
        for (const ca of collapsedAncestors) {
          if (Number(ca.dataset.depth) < childDepth) {
            hiddenByAncestor = true
            break
          }
        }
        if (hiddenByAncestor) continue

        child.classList.remove('app-tree-node--collapsed')

        // If this child is itself a collapsed parent, keep its children hidden
        const childBtn = child.querySelector('.app-tree-toggle')
        if (childBtn && childBtn.getAttribute('aria-expanded') === 'false') {
          collapsedAncestors.add(child)
        }
      } else {
        child.classList.add('app-tree-node--collapsed')
      }
    }
  }

  /** Expand-all or collapse-all nodes. */
  function setAll(expand) {
    for (const node of nodes) {
      if (expand) {
        node.classList.remove('app-tree-node--collapsed')
      } else if (Number(node.dataset.depth) > 0) {
        node.classList.add('app-tree-node--collapsed')
      }

      const btn = node.querySelector('.app-tree-toggle')
      if (btn) {
        btn.setAttribute('aria-expanded', expand ? 'true' : 'false')
      }
    }
  }
}

initOperationTree()
