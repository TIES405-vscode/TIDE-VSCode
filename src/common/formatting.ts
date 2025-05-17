  import path from 'path'
  import * as os from 'os'
  
  export default class Formatting {
  
  public static normalizePath(pathString: string): string {
    if (!pathString) {return pathString}
    //expand ~ to whole path
    const expanded = pathString.startsWith('~') ? path.join(os.homedir(), pathString.slice(1)) : pathString
    //expand relative path
    const resolved = path.resolve(expanded)
    //replace separators with '/'
    const posixPath = resolved.split(path.sep).join(path.posix.sep)
    //consistent drive letter casing
    return process.platform === 'win32' && /^[A-Z]:/i.test(posixPath)
    ? posixPath.charAt(0).toLowerCase() + posixPath.slice(1)
    : posixPath
  }

  public static normalizeSeparator(pathString: string): string {
    if (!pathString) {return pathString}
    //replace separators with '/'
    const posixPath = pathString.split(path.sep).join(path.posix.sep)
    return posixPath
  }
}