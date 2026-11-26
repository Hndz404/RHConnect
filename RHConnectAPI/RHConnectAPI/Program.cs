
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://127.0.0.1:5500",
                "http://localhost:5500"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Configuração do Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Registro dos repositórios e serviços
builder.Services.AddScoped<RHConnectAPI.Data.FuncionarioRepository>();
builder.Services.AddScoped<RHConnectAPI.Data.SenhaService>();
builder.Services.AddScoped<RHConnectAPI.Data.RegistroPontoRepository>();
builder.Services.AddScoped<RHConnectAPI.Data.BancoHoraRepository>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("PermitirFrontend");

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
