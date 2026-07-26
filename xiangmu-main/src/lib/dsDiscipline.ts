/** DS3 交互纪律哨兵（组件外的纯计数器，供 ds.tsx 组件挂载时登记）。
 *  只在 dev 提示、不阻断渲染。 */

let primaryMounted = 0;
let warned = false;

export function registerPrimaryAction(dev: boolean): void {
  primaryMounted++;
  if (dev && primaryMounted > 1 && !warned) {
    warned = true;
    console.warn(
      `[DS3] 同屏出现 ${primaryMounted} 个 PrimaryAction——每屏只允许一个主动作（不阻断渲染）`,
    );
  }
}

export function unregisterPrimaryAction(): void {
  primaryMounted--;
  if (primaryMounted <= 1) warned = false;
}

export function primaryActionCount(): number {
  return primaryMounted;
}
