#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
  error::Error,
  fs,
  net::{TcpListener, TcpStream},
  path::PathBuf,
  process::{Child, Command, Stdio},
  sync::{Arc, Mutex},
  thread,
  time::{Duration, Instant},
};

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const SERVER_HOST: &str = "127.0.0.1";
const DEV_SERVER_PORT: u16 = 3000;

#[derive(Clone)]
struct ServerState(Arc<Mutex<Option<Child>>>);

fn main() {
  let server_state = ServerState(Arc::new(Mutex::new(None)));
  let shutdown_state = server_state.0.clone();

  tauri::Builder::default()
    .manage(server_state)
    .setup(|app| {
      let start_url = if cfg!(debug_assertions) {
        format!("http://{SERVER_HOST}:{DEV_SERVER_PORT}")
      } else {
        start_production_server(app.handle())?
      };

      let window_url = WebviewUrl::External(start_url.parse()?);

      WebviewWindowBuilder::new(app, "main", window_url)
        .title("Ragnarok Farmer")
        .inner_size(1440.0, 960.0)
        .min_inner_size(1100.0, 760.0)
        .build()?;

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("failed to build Tauri application")
    .run(move |_app_handle, event| {
      if matches!(event, tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }) {
        if let Ok(mut guard) = shutdown_state.lock() {
          if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
          }
        }
      }
    });
}

fn start_production_server(app: &tauri::AppHandle) -> Result<String, Box<dyn Error>> {
  let resource_dir = app.path().resource_dir()?;
  let app_bundle_dir = resource_dir.join("bundle").join("app");
  let node_executable = resource_dir
    .join("bundle")
    .join("bin")
    .join(if cfg!(target_os = "windows") { "node.exe" } else { "node" });
  let server_script = app_bundle_dir.join("server.js");
  let app_data_dir = app.path().app_data_dir()?;
  let server_port = reserve_local_port()?;

  fs::create_dir_all(&app_data_dir)?;

  let database_url = build_database_url(app_data_dir.join("ragnarok-farmer.db"));
  let mut command = Command::new(node_executable);

  command
    .arg(server_script)
    .current_dir(app_bundle_dir)
    .env("NODE_ENV", "production")
    .env("HOSTNAME", SERVER_HOST)
    .env("PORT", server_port.to_string())
    .env("DATABASE_URL", database_url)
    .stdout(Stdio::null())
    .stderr(Stdio::null());

  #[cfg(target_os = "windows")]
  command.creation_flags(CREATE_NO_WINDOW);

  let child = command.spawn()?;

  {
    let server_state = app.state::<ServerState>();
    let mut guard = server_state
      .0
      .lock()
      .map_err(|_| "failed to lock desktop server state")?;
    *guard = Some(child);
  }

  wait_for_server(server_port, Duration::from_secs(20))?;

  Ok(format!("http://{SERVER_HOST}:{server_port}"))
}

fn reserve_local_port() -> Result<u16, Box<dyn Error>> {
  let listener = TcpListener::bind((SERVER_HOST, 0))?;
  let port = listener.local_addr()?.port();
  drop(listener);

  Ok(port)
}

fn wait_for_server(port: u16, timeout: Duration) -> Result<(), Box<dyn Error>> {
  let deadline = Instant::now() + timeout;

  while Instant::now() < deadline {
    if TcpStream::connect((SERVER_HOST, port)).is_ok() {
      return Ok(());
    }

    thread::sleep(Duration::from_millis(250));
  }

  Err("timeout while waiting for the embedded Next server".into())
}

fn build_database_url(database_path: PathBuf) -> String {
  let normalized_path = database_path.to_string_lossy().replace('\\', "/");
  format!("file:{normalized_path}")
}
