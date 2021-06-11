export class REDEYE_New_Data {
    user_id: String;
    data_value: String;
    create_datetime: String;
    spectrum: Array<REDEYE_Raw_Data>;

    constructor() {
        this.user_id = "";
        this.data_value = "";
        this.create_datetime = "";
        this.spectrum = new Array<REDEYE_Raw_Data>();
    }
}

export class REDEYE_Raw_Data {
    wavelength: number;
    blank: number;
    sample: number;

    constructor() {
        this.wavelength = 0;
        this.blank = 0;
        this.sample = 0;
    }
}