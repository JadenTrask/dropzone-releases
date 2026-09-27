param([switch]$SelfTest)
$ErrorActionPreference = 'Stop'
$source = @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
public class DZGameWindow {
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
 [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int Size; public RECT Monitor,Work; public int Flags; }
 [StructLayout(LayoutKind.Sequential)] public struct MSG { public IntPtr hwnd; public uint message; public UIntPtr wParam; public IntPtr lParam; public uint time; public POINT pt; }
 delegate bool EnumProc(IntPtr h,IntPtr l);
 delegate void EventProc(IntPtr hook,uint ev,IntPtr h,int obj,int child,uint thread,uint time);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb,IntPtr l);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr h,ref POINT p);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h,uint f);
 [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr h,ref MONITORINFO m);
 [DllImport("user32.dll")] static extern IntPtr SetWinEventHook(uint min,uint max,IntPtr module,EventProc cb,uint pid,uint tid,uint flags);
 [DllImport("user32.dll")] static extern bool GetMessage(out MSG m,IntPtr h,uint min,uint max);
 [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
 [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);
 static IntPtr game; static EventProc callback; static string last="";
 public static string BoundsJson(int x,int y,int width,int height,int mx,int my,int mw,int mh){return String.Format("{{\"x\":{0},\"y\":{1},\"width\":{2},\"height\":{3},\"monitor\":{{\"x\":{4},\"y\":{5},\"width\":{6},\"height\":{7}}}}}",x,y,width,height,mx,my,mw,mh);}
 static void Emit(){
  if(game==IntPtr.Zero||!IsWindowVisible(game)||IsIconic(game)){Console.WriteLine("{\"hidden\":true}");return;}
  RECT r;GetClientRect(game,out r);POINT p=new POINT();ClientToScreen(game,ref p);
  MONITORINFO m=new MONITORINFO();m.Size=Marshal.SizeOf(m);GetMonitorInfo(MonitorFromWindow(game,2),ref m);
  string value=BoundsJson(p.X,p.Y,r.Right-r.Left,r.Bottom-r.Top,m.Monitor.Left,m.Monitor.Top,m.Monitor.Right-m.Monitor.Left,m.Monitor.Bottom-m.Monitor.Top);
  if(last!=value){last=value;Console.WriteLine(value);Console.Out.Flush();}
 }
 public static void Run(){
  SetThreadDpiAwarenessContext(new IntPtr(-4));
  var processes=Process.GetProcessesByName("RocketLeague");int area=0;
  EnumWindows((h,l)=>{uint pid;GetWindowThreadProcessId(h,out pid);foreach(var proc in processes)if(proc.Id==pid&&IsWindowVisible(h)){RECT r;GetClientRect(h,out r);int a=(r.Right-r.Left)*(r.Bottom-r.Top);if(a>area){game=h;area=a;}}return true;},IntPtr.Zero);
  foreach(var proc in processes)proc.Dispose();
  if(game==IntPtr.Zero){Console.WriteLine("{\"error\":\"Open Rocket League in Borderless or Windowed mode first.\"}");return;}
  int state;SHQueryUserNotificationState(out state);
  if(state==3){Console.WriteLine("{\"error\":\"Windows reports a full-screen Direct3D game. Switch Rocket League to Borderless for the coaching overlay.\"}");return;}
  if(IsIconic(game)){Console.WriteLine("{\"error\":\"Restore Rocket League before opening the coaching overlay.\"}");return;}
  SetForegroundWindow(game);Emit();
  callback=(hook,ev,h,obj,child,thread,time)=>{if(ev==3){long overlay;long.TryParse(Environment.GetEnvironmentVariable("DZ_OVERLAY_HWND"),out overlay);if(h==game){last="";Emit();Console.WriteLine("{\"suspended\":false}");}else if(h.ToInt64()!=overlay)Console.WriteLine("{\"suspended\":true}");return;}if(h!=game)return;if(ev==0x8001&&obj==0){Console.WriteLine("{\"closed\":true}");return;}if(obj==0||ev==0x0016||ev==0x0017)Emit();};
  SetWinEventHook(0x800B,0x800B,IntPtr.Zero,callback,0,0,0);
  SetWinEventHook(0x8001,0x8001,IntPtr.Zero,callback,0,0,0);
  SetWinEventHook(0x0016,0x0017,IntPtr.Zero,callback,0,0,0);
  SetWinEventHook(3,3,IntPtr.Zero,callback,0,0,0);
  new Thread(()=>{while(true){var command=Console.ReadLine();if(command==null)Environment.Exit(0);if(command=="exit"){SetForegroundWindow(game);Environment.Exit(0);}}}){IsBackground=true}.Start();
  MSG msg;while(GetMessage(out msg,IntPtr.Zero,0,0)){}
 }
}
"@
$cacheDirectory = $env:DZ_COACH_CACHE
if ([string]::IsNullOrWhiteSpace($cacheDirectory)) { throw 'Coaching cache directory is missing.' }
[IO.Directory]::CreateDirectory($cacheDirectory) | Out-Null
$sha = [Security.Cryptography.SHA256]::Create()
try { $hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($source)))).Replace('-', '') } finally { $sha.Dispose() }
$assemblyFile = [IO.Path]::Combine($cacheDirectory, 'observer-' + $hash + '.dll')
if (-not [IO.File]::Exists($assemblyFile)) {
 $temporaryAssembly = [IO.Path]::Combine($cacheDirectory, 'observer-' + [Guid]::NewGuid().ToString('N') + '.dll')
 Add-Type -TypeDefinition $source -OutputAssembly $temporaryAssembly
 try { [IO.File]::Move($temporaryAssembly, $assemblyFile) } catch { if (-not [IO.File]::Exists($assemblyFile)) { throw }; [IO.File]::Delete($temporaryAssembly) }
}
Add-Type -Path $assemblyFile
if ($SelfTest) { [DZGameWindow]::BoundsJson(-3840, 0, 3840, 2160, -3840, 0, 3840, 2160); exit 0 }
[DZGameWindow]::Run()
